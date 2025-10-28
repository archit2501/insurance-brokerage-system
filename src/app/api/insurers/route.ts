import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { insurers, auditLogs } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import { nextEntityCode } from '../_lib/sequences';
import { validateNAICOM, authenticateRequest } from '@/app/api/_lib/auth';

// Helper function to validate date format (UAT: allow past dates)
function validateLicenseExpiry(licenseExpiry: string | null | undefined): { valid: boolean; error?: string; normalizedDate?: string } {
  // Allow null/undefined for UAT testing
  if (!licenseExpiry) {
    return { valid: true, normalizedDate: undefined };
  }
  
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
  
  // UAT: Allow past dates for testing historical data
  // TODO: For production, uncomment below to prevent past dates
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);
  // const expiry = new Date(dateToValidate);
  // expiry.setHours(0, 0, 0, 0);
  // if (expiry < today) {
  //   return { valid: false, error: 'License expiry date cannot be in the past' };
  // }
  
  return { valid: true, normalizedDate: dateToValidate };
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const forDropdown = searchParams.get('for') === 'dropdown';

    let query = db.select().from(insurers);
    const conditions = [];

    // Default to active only for dropdown unless explicitly including inactive
    if (forDropdown && !includeInactive) {
      conditions.push(eq(insurers.status, 'active'));
    } else if (status) {
      conditions.push(eq(insurers.status, status));
    }

    if (city) {
      conditions.push(eq(insurers.city, city));
    }

    if (search) {
      conditions.push(
        or(
          like(insurers.companyName, `%${search}%`),
          like(insurers.shortName, `%${search}%`),
          like(insurers.licenseNumber, `%${search}%`),
          like(insurers.city, `%${search}%`),
          like(insurers.acceptedLobs, `%${search}%`),
          like(insurers.specialLobs, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(insurers.createdAt));

    // Parse JSON fields for frontend
    const parsedResults = results.map(insurer => ({
      ...insurer,
      acceptedLobs: typeof insurer.acceptedLobs === 'string' 
        ? JSON.parse(insurer.acceptedLobs || '[]') 
        : (insurer.acceptedLobs || []),
      specialLobs: typeof insurer.specialLobs === 'string' 
        ? JSON.parse(insurer.specialLobs || '[]') 
        : (insurer.specialLobs || [])
    }));

    return NextResponse.json(parsedResults);
  } catch (error) {
    console.error('GET insurers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const body = await request.json();
    const { 
      companyName, shortName, licenseNumber, licenseExpiry,
      address, city, state, country = 'Nigeria',
      website, acceptedLobs, specialLobs, status
    } = body;

    // Validate required fields (licenseExpiry is optional for UAT)
    if (!companyName || !shortName || !licenseNumber || !address || !city || !state) {
      return NextResponse.json({
        error: 'Missing required fields: companyName, shortName, licenseNumber, address, city, state',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Security: Reject if insurer_code or insurerCode provided in request body
    if ('insurer_code' in body || 'insurerCode' in body) {
      return NextResponse.json({ 
        error: "Insurer code is auto-generated and cannot be provided in request body",
        code: "INSURER_CODE_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Security: Reject if user ID fields provided
    if ('userId' in body || 'user_id' in body || 'createdBy' in body || 'updatedBy' in body) {
      return NextResponse.json({ 
        error: "User ID fields are auto-generated and cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate company name length and format
    if (typeof companyName !== 'string' || companyName.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Company name must be a non-empty string',
        code: 'INVALID_COMPANY_NAME'
      }, { status: 400 });
    }

    // Validate NAICOM license format
    const licCheck = validateNAICOM(licenseNumber);
    if (!licCheck.success) {
      return NextResponse.json({ error: licCheck.error || 'Invalid license format', code: 'INVALID_LICENSE' }, { status: 400 });
    }

    // Validate license expiry date (optional for UAT)
    const expiryCheck = validateLicenseExpiry(licenseExpiry);
    if (!expiryCheck.valid) {
      return NextResponse.json({ 
        error: expiryCheck.error || 'Invalid license expiry date',
        code: 'INVALID_LICENSE_EXPIRY' 
      }, { status: 400 });
    }

    // Use normalized date from validation result
    const normalizedExpiry = expiryCheck.normalizedDate || licenseExpiry;

    // Check for duplicate license number
    const existingLicense = await db.select()
      .from(insurers)
      .where(eq(insurers.licenseNumber, licenseNumber.trim().toUpperCase()))
      .limit(1);

    if (existingLicense.length > 0) {
      return NextResponse.json({ 
        error: 'License number already exists',
        code: 'DUPLICATE_LICENSE'
      }, { status: 400 });
    }

    // Check for duplicate company name (case-insensitive)
    const existingCompany = await db.select()
      .from(insurers)
      .where(sql`LOWER(TRIM(${insurers.companyName})) = ${companyName.trim().toLowerCase()}`)
      .limit(1);

    if (existingCompany.length > 0) {
      return NextResponse.json({ 
        error: 'Company name already exists',
        code: 'DUPLICATE_COMPANY_NAME'
      }, { status: 400 });
    }

    // Validate status
    const normalizedStatus = status || 'active';
    if (normalizedStatus !== 'active' && normalizedStatus !== 'inactive') {
      return NextResponse.json({ 
        error: "Status must be 'active' or 'inactive'",
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Get current user ID from auth
    const currentUserId = request.headers.get('x-user-id');
    const createdByUserId = currentUserId ? parseInt(currentUserId) : null;

    // Generate insurer code using centralized service
    const { code: insurerCode } = await nextEntityCode(db, { 
      entity: 'INSURER'
    });

    const now = new Date().toISOString();

    const newInsurer = await db.insert(insurers)
      .values({
        insurerCode,
        companyName: companyName.trim(),
        shortName: shortName.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseExpiry: normalizedExpiry,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country?.trim() || 'Nigeria',
        website: website?.trim() || null,
        acceptedLobs: JSON.stringify(acceptedLobs || []),
        specialLobs: JSON.stringify(specialLobs || []),
        status: normalizedStatus,
        createdBy: createdByUserId,
        updatedBy: createdByUserId,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Audit log
    if (createdByUserId) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

      await db.insert(auditLogs).values({
        tableName: 'insurers',
        recordId: newInsurer[0].id,
        action: 'CREATE',
        oldValues: null,
        newValues: newInsurer[0],
        userId: createdByUserId,
        ipAddress,
        userAgent: request.headers.get('user-agent'),
        createdAt: new Date().toISOString()
      });
    }

    // Parse JSON fields before returning
    const responseInsurer = {
      ...newInsurer[0],
      acceptedLobs: typeof newInsurer[0].acceptedLobs === 'string' 
        ? JSON.parse(newInsurer[0].acceptedLobs || '[]') 
        : (newInsurer[0].acceptedLobs || []),
      specialLobs: typeof newInsurer[0].specialLobs === 'string' 
        ? JSON.parse(newInsurer[0].specialLobs || '[]') 
        : (newInsurer[0].specialLobs || [])
    };

    return NextResponse.json(responseInsurer, { status: 201 });
  } catch (error) {
    console.error('POST insurer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
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
      // Use normalized date from validation result (could be undefined if null passed)
      updates.licenseExpiry = expiryCheck.normalizedDate || body.licenseExpiry;
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

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    // Audit log
    if (currentUserId) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

      await db.insert(auditLogs).values({
        tableName: 'insurers',
        recordId: parseInt(id),
        action: 'UPDATE',
        oldValues: current,
        newValues: updated[0],
        userId: parseInt(currentUserId),
        ipAddress,
        userAgent: request.headers.get('user-agent'),
        createdAt: new Date().toISOString()
      });
    }

    // Parse JSON fields before returning
    const responseInsurer = {
      ...updated[0],
      acceptedLobs: typeof updated[0].acceptedLobs === 'string' 
        ? JSON.parse(updated[0].acceptedLobs || '[]') 
        : (updated[0].acceptedLobs || []),
      specialLobs: typeof updated[0].specialLobs === 'string' 
        ? JSON.parse(updated[0].specialLobs || '[]') 
        : (updated[0].specialLobs || [])
    };

    return NextResponse.json(responseInsurer);
  } catch (error) {
    console.error('PUT insurer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
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
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

      await db.insert(auditLogs).values({
        tableName: 'insurers',
        recordId: parseInt(id),
        action: 'UPDATE',
        oldValues: existingInsurer[0],
        newValues: deleted[0],
        userId: parseInt(currentUserId),
        ipAddress,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}