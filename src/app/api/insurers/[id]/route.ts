import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { insurers, auditLogs } from '@/db/schema';
import { eq, and, like, desc, asc, sql } from 'drizzle-orm';
import { authenticateToken, requireRole, VALID_ROLES, validateNAICOM } from '@/app/api/_lib/auth';

// Helper function to validate date format and ensure it's not in the past
function validateLicenseExpiry(licenseExpiry: string): { valid: boolean; error?: string } {
  // Accept YYYY-MM-DD or ISO date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let dateToValidate = licenseExpiry;
  
  // If it's an ISO string, extract the date part
  if (licenseExpiry.includes('T')) {
    dateToValidate = licenseExpiry.split('T')[0];
  }
  
  if (!dateRegex.test(dateToValidate)) {
    return { valid: false, error: 'License expiry must be in YYYY-MM-DD format' };
  }
  
  const expiryDate = new Date(dateToValidate);
  if (isNaN(expiryDate.getTime())) {
    return { valid: false, error: 'Invalid license expiry date' };
  }
  
  // Check if date is today or in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(dateToValidate);
  expiry.setHours(0, 0, 0, 0);
  
  if (expiry < today) {
    return { valid: false, error: 'License expiry date cannot be in the past' };
  }
  
  return { valid: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth required for reading single insurer
    const auth = authenticateToken(request);
    if (!auth.success) return auth.response;

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const insurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(id)))
      .limit(1);

    if (insurer.length === 0) {
      return NextResponse.json({ error: 'Insurer not found' }, { status: 404 });
    }

    return NextResponse.json(insurer[0]);
  } catch (error) {
    console.error('GET insurer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require Underwriter or higher to update insurers
    const roleCheck = requireRole(request, VALID_ROLES.UNDERWRITER);
    if (!roleCheck.success) return roleCheck.response;

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security: Reject immutable fields
    if ('licenseNumber' in body || 'insurerCode' in body || 'createdBy' in body || 'createdAt' in body) {
      return NextResponse.json({ 
        error: 'Cannot update immutable fields: licenseNumber, insurerCode, createdBy, createdAt',
        code: 'IMMUTABLE_FIELDS'
      }, { status: 400 });
    }

    // Security: Reject user ID fields
    if ('userId' in body || 'user_id' in body || 'updatedBy' in body) {
      return NextResponse.json({ 
        error: "User ID fields are auto-generated and cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }
    
    const existingInsurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(id)))
      .limit(1);

    if (existingInsurer.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const current = existingInsurer[0];
    const updates: any = {};

    // Validate and update company name with duplicate check
    if ('companyName' in body) {
      if (!body.companyName || typeof body.companyName !== 'string' || body.companyName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Company name must be a non-empty string',
          code: 'INVALID_COMPANY_NAME'
        }, { status: 400 });
      }

      const trimmedName = body.companyName.trim();
      
      // Check for duplicate company name (case-insensitive, excluding current record)
      if (trimmedName.toLowerCase() !== current.companyName.toLowerCase()) {
        const duplicateCompany = await db.select()
          .from(insurers)
          .where(sql`LOWER(TRIM(${insurers.companyName})) = ${trimmedName.toLowerCase()} AND ${insurers.id} != ${parseInt(id)}`)
          .limit(1);

        if (duplicateCompany.length > 0) {
          return NextResponse.json({ 
            error: 'Company name already exists',
            code: 'DUPLICATE_COMPANY_NAME'
          }, { status: 400 });
        }
      }

      updates.companyName = trimmedName;
    }

    // Update other allowed fields
    if ('shortName' in body) {
      if (!body.shortName || typeof body.shortName !== 'string' || body.shortName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Short name must be a non-empty string',
          code: 'INVALID_SHORT_NAME'
        }, { status: 400 });
      }
      updates.shortName = body.shortName.trim();
    }

    if ('licenseExpiry' in body) {
      const expiryCheck = validateLicenseExpiry(body.licenseExpiry);
      if (!expiryCheck.valid) {
        return NextResponse.json({ 
          error: expiryCheck.error || 'Invalid license expiry date',
          code: 'INVALID_LICENSE_EXPIRY' 
        }, { status: 400 });
      }
      // Normalize to YYYY-MM-DD format
      updates.licenseExpiry = body.licenseExpiry.includes('T') ? body.licenseExpiry.split('T')[0] : body.licenseExpiry;
    }

    if ('address' in body) updates.address = body.address?.trim() || null;
    if ('city' in body) updates.city = body.city?.trim() || null;
    if ('state' in body) updates.state = body.state?.trim() || null;
    if ('country' in body) updates.country = body.country?.trim() || 'Nigeria';
    if ('website' in body) updates.website = body.website?.trim() || null;

    if ('acceptedLobs' in body) {
      if (!Array.isArray(body.acceptedLobs)) {
        return NextResponse.json({ 
          error: 'acceptedLobs must be an array',
          code: 'INVALID_ACCEPTED_LOBS'
        }, { status: 400 });
      }
      updates.acceptedLobs = JSON.stringify(body.acceptedLobs);
    }

    if ('specialLobs' in body) {
      if (!Array.isArray(body.specialLobs)) {
        return NextResponse.json({ 
          error: 'specialLobs must be an array',
          code: 'INVALID_SPECIAL_LOBS'
        }, { status: 400 });
      }
      updates.specialLobs = JSON.stringify(body.specialLobs);
    }

    if ('status' in body) {
      if (body.status !== 'active' && body.status !== 'inactive') {
        return NextResponse.json({ 
          error: "Status must be 'active' or 'inactive'",
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update',
        code: 'NO_VALID_UPDATES'
      }, { status: 400 });
    }

    // Set updatedBy and updatedAt
    const currentUserId = request.headers.get('x-user-id');
    updates.updatedBy = currentUserId ? parseInt(currentUserId) : null;
    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(insurers)
      .set(updates)
      .where(eq(insurers.id, parseInt(id)))
      .returning();

    // Audit log
    if (currentUserId) {
      await db.insert(auditLogs).values({
        tableName: 'insurers',
        recordId: parseInt(id),
        action: 'UPDATE',
        oldValues: current,
        newValues: updated[0],
        userId: parseInt(currentUserId),
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT insurer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require Admin to delete insurers
    const roleCheck = requireRole(request, VALID_ROLES.ADMIN);
    if (!roleCheck.success) return roleCheck.response;

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const existingInsurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(id)))
      .limit(1);

    if (existingInsurer.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const currentUserId = request.headers.get('x-user-id');

    // Soft delete by setting status to inactive
    const deleted = await db.update(insurers)
      .set({ 
        status: 'inactive',
        updatedBy: currentUserId ? parseInt(currentUserId) : null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(insurers.id, parseInt(id)))
      .returning();

    // Audit log
    if (currentUserId) {
      await db.insert(auditLogs).values({
        tableName: 'insurers',
        recordId: parseInt(id),
        action: 'UPDATE',
        oldValues: existingInsurer[0],
        newValues: deleted[0],
        userId: parseInt(currentUserId),
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      message: 'Insurer successfully deactivated',
      insurer: deleted[0]
    });
  } catch (error) {
    console.error('DELETE insurer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}