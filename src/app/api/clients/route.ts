import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, users, auditLogs } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import { nextEntityCode } from '../_lib/sequences';
import { validateTIN, validateCACOrRC, authenticateRequest, safeParseUserId } from '@/app/api/_lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }
      
      const client = await db.select({
        id: clients.id,
        clientCode: clients.clientCode,
        companyName: clients.companyName,
        clientType: clients.clientType,
        cacRcNumber: clients.cacRcNumber,
        tin: clients.tin,
        industry: clients.industry,
        address: clients.address,
        city: clients.city,
        state: clients.state,
        country: clients.country,
        website: clients.website,
        kycStatus: clients.kycStatus,
        status: clients.status,
        createdBy: clients.createdBy,
        createdByName: users.fullName,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt
      })
        .from(clients)
        .leftJoin(users, eq(clients.createdBy, users.id))
        .where(eq(clients.id, parseInt(id)))
        .limit(1);
      
      if (client.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      
      return NextResponse.json(client[0]);
    }
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const kycStatus = searchParams.get('kyc_status');
    const clientType = searchParams.get('client_type');
    
    let query = db.select({
      id: clients.id,
      clientCode: clients.clientCode,
      companyName: clients.companyName,
      clientType: clients.clientType,
      cacRcNumber: clients.cacRcNumber,
      tin: clients.tin,
      industry: clients.industry,
      address: clients.address,
      city: clients.city,
      state: clients.state,
      country: clients.country,
      website: clients.website,
      kycStatus: clients.kycStatus,
      status: clients.status,
      createdBy: clients.createdBy,
      createdByName: users.fullName,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    })
      .from(clients)
      .leftJoin(users, eq(clients.createdBy, users.id))
      .$dynamic();
    
    const conditions = [];
    
    if (status) {
      conditions.push(eq(clients.status, status));
    }
    
    if (kycStatus) {
      conditions.push(eq(clients.kycStatus, kycStatus));
    }
    
    if (clientType) {
      conditions.push(eq(clients.clientType, clientType));
    }
    
    if (search) {
      const searchCondition = or(
        like(clients.companyName, `%${search}%`),
        like(clients.cacRcNumber, `%${search}%`),
        like(clients.tin, `%${search}%`)
      );
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions, searchCondition));
      } else {
        query = query.where(searchCondition);
      }
    } else if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    
    let orderBy;
    switch (sort) {
      case 'companyName':
        orderBy = order === 'asc' ? asc(clients.companyName) : desc(clients.companyName);
        break;
      case 'cacRcNumber':
        orderBy = order === 'asc' ? asc(clients.cacRcNumber) : desc(clients.cacRcNumber);
        break;
      case 'tin':
        orderBy = order === 'asc' ? asc(clients.tin) : desc(clients.tin);
        break;
      case 'kycStatus':
        orderBy = order === 'asc' ? asc(clients.kycStatus) : desc(clients.kycStatus);
        break;
      case 'status':
        orderBy = order === 'asc' ? asc(clients.status) : desc(clients.status);
        break;
      case 'createdAt':
      default:
        orderBy = order === 'asc' ? asc(clients.createdAt) : desc(clients.createdAt);
    }
    
    const results = await query
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
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
      companyName,
      clientType, // 'Company' or 'Individual'
      cacRcNumber,
      tin,
      industry,
      address,
      city,
      state,
      country,
      website
    } = body;
    
    // companyName is always required
    if (!companyName || !industry || !address || !city || !state) {
      return NextResponse.json({ 
        error: "Required fields are missing: companyName, industry, address, city, state",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Determine client type (default to Company if not provided for backwards compatibility)
    const effectiveClientType = clientType || 'Company';
    
    // Validate clientType
    if (effectiveClientType !== 'Company' && effectiveClientType !== 'Individual') {
      return NextResponse.json({ 
        error: "clientType must be 'Company' or 'Individual'",
        code: "INVALID_CLIENT_TYPE" 
      }, { status: 400 });
    }
    
    // For Company type, CAC/TIN are required
    // For Individual type, CAC/TIN are optional
    if (effectiveClientType === 'Company') {
      if (!cacRcNumber || !tin) {
        return NextResponse.json({ 
          error: "CAC/RC Number and TIN are required for Company clients",
          code: "MISSING_CORPORATE_FIELDS" 
        }, { status: 400 });
      }
    }
    
    // Normalize empty strings to null for optional fields
    const normalizedCacRc = (cacRcNumber && cacRcNumber.trim()) ? cacRcNumber.trim().toUpperCase() : null;
    const normalizedTin = (tin && tin.trim()) ? tin.trim() : null;
    const normalizedWebsite = (website && website.trim()) ? website.trim() : null;
    
    const trimmedData = {
      companyName: companyName.trim(),
      clientType: effectiveClientType,
      cacRcNumber: normalizedCacRc,
      tin: normalizedTin,
      industry: industry.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country?.trim() || 'Nigeria',
      website: normalizedWebsite
    };

    // Validate CAC/TIN formats only if provided
    if (trimmedData.cacRcNumber) {
      const cacCheck = validateCACOrRC(trimmedData.cacRcNumber);
      if (!cacCheck.success) {
        return NextResponse.json({ error: cacCheck.error || 'Invalid CAC/RC format (expected 6-10 alphanumeric)', code: 'INVALID_CAC_RC' }, { status: 400 });
      }
    }
    
    if (trimmedData.tin) {
      const tinCheck = validateTIN(trimmedData.tin);
      if (!tinCheck.success) {
        return NextResponse.json({ error: tinCheck.error || 'Invalid TIN format (expected 8-12 digits)', code: 'INVALID_TIN' }, { status: 400 });
      }
      // Normalize TIN for storage/search (digits only)
      trimmedData.tin = trimmedData.tin.replace(/\D/g, '');
    }
    
    // Check for duplicates only if values are provided
    if (trimmedData.cacRcNumber) {
      const existingByCac = await db.select()
        .from(clients)
        .where(eq(clients.cacRcNumber, trimmedData.cacRcNumber))
        .limit(1);
      
      if (existingByCac.length > 0) {
        return NextResponse.json({ 
          error: "CAC/RC number already exists",
          code: "DUPLICATE_CAC_RC"
        }, { status: 400 });
      }
    }
    
    if (trimmedData.tin) {
      const existingByTin = await db.select()
        .from(clients)
        .where(eq(clients.tin, trimmedData.tin))
        .limit(1);
      
      if (existingByTin.length > 0) {
        return NextResponse.json({ 
          error: "TIN already exists",
          code: "DUPLICATE_TIN"
        }, { status: 400 });
      }
    }
    
    const now = new Date().toISOString();

    // Generate centralized client code
    const typeCode = effectiveClientType === 'Individual' ? 'IND' : 'CORP';
    const { code: clientCode } = await nextEntityCode(db, { entity: 'CLIENT', type: typeCode });
    
    // UAT: Better-auth uses text IDs, but createdBy expects integer
    // TODO: Migrate createdBy to text or create user sync mechanism
    const createdByInt = safeParseUserId(authResult.userId);
    
    const newClient = await db.insert(clients)
      .values({
        ...trimmedData,
        clientCode,
        kycStatus: 'pending',
        status: 'active',
        createdBy: createdByInt,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return NextResponse.json(newClient[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
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
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }
    
    const body = await request.json();
    const {
      companyName,
      clientType,
      cacRcNumber,
      tin,
      industry,
      address,
      city,
      state,
      country,
      website,
      kycStatus,
      status
    } = body;
    
    const existing = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(id)))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    const currentClient = existing[0];
    const updates: any = {};
    
    // Validate clientType if provided
    if (clientType !== undefined) {
      if (clientType !== 'Company' && clientType !== 'Individual') {
        return NextResponse.json({ 
          error: "clientType must be 'Company' or 'Individual'",
          code: "INVALID_CLIENT_TYPE" 
        }, { status: 400 });
      }
      updates.clientType = clientType;
    }
    
    // Determine effective clientType for validation
    const effectiveClientType = updates.clientType ?? currentClient.clientType;
    
    // For Company type, validate CAC/RC and TIN if provided
    if (effectiveClientType === 'Company') {
      if (cacRcNumber !== undefined) {
        if (!cacRcNumber) {
          return NextResponse.json({ 
            error: "CAC/RC number is required for Company type clients",
            code: "MISSING_CAC_RC" 
          }, { status: 400 });
        }
        
        const trimmedCac = cacRcNumber.trim().toUpperCase();
        const cacCheck = validateCACOrRC(trimmedCac);
        if (!cacCheck.success) {
          return NextResponse.json({ error: cacCheck.error || 'Invalid CAC/RC format', code: 'INVALID_CAC_RC' }, { status: 400 });
        }
        
        if (trimmedCac !== currentClient.cacRcNumber) {
          const duplicate = await db.select()
            .from(clients)
            .where(eq(clients.cacRcNumber, trimmedCac))
            .limit(1);
          
          if (duplicate.length > 0) {
            return NextResponse.json({ 
              error: "CAC/RC number already exists",
              code: "DUPLICATE_CAC_RC"
            }, { status: 400 });
          }
        }
        updates.cacRcNumber = trimmedCac;
      }
      
      if (tin !== undefined) {
        if (!tin) {
          return NextResponse.json({ 
            error: "TIN is required for Company type clients",
            code: "MISSING_TIN" 
          }, { status: 400 });
        }
        
        let trimmedTin = tin.trim();
        const tinCheck = validateTIN(trimmedTin);
        if (!tinCheck.success) {
          return NextResponse.json({ error: tinCheck.error || 'Invalid TIN format', code: 'INVALID_TIN' }, { status: 400 });
        }
        trimmedTin = trimmedTin.replace(/\D/g, '');
        
        if (trimmedTin !== currentClient.tin) {
          const duplicate = await db.select()
            .from(clients)
            .where(eq(clients.tin, trimmedTin))
            .limit(1);
          
          if (duplicate.length > 0) {
            return NextResponse.json({ 
              error: "TIN already exists",
              code: "DUPLICATE_TIN"
            }, { status: 400 });
          }
        }
        updates.tin = trimmedTin;
      }
    } else {
      // For Individual type, allow nullable CAC/RC and TIN
      if (cacRcNumber !== undefined) {
        updates.cacRcNumber = cacRcNumber ? cacRcNumber.trim().toUpperCase() : null;
      }
      if (tin !== undefined) {
        updates.tin = tin ? tin.trim().replace(/\D/g, '') : null;
      }
    }
    
    if (companyName !== undefined) updates.companyName = companyName.trim();
    if (industry !== undefined) updates.industry = industry.trim();
    if (address !== undefined) updates.address = address.trim();
    if (city !== undefined) updates.city = city.trim();
    if (state !== undefined) updates.state = state.trim();
    if (country !== undefined) updates.country = country.trim();
    if (website !== undefined) updates.website = website?.trim() || null;
    if (kycStatus !== undefined) updates.kycStatus = kycStatus;
    if (status !== undefined) updates.status = status;
    
    updates.updatedAt = new Date().toISOString();
    
    const updated = await db.update(clients)
      .set(updates)
      .where(eq(clients.id, parseInt(id)))
      .returning();
    
    // UAT: Handle better-auth string IDs for audit logs
    const auditUserId = safeParseUserId(authResult.userId);
    
    // Log audit trail
    await db.insert(auditLogs).values({
      tableName: 'clients',
      recordId: parseInt(id),
      action: 'UPDATE',
      oldValues: existing[0],
      newValues: updated[0],
      userId: auditUserId,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
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
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }
    
    const existing = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(id)))
      .limit(1);
    
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    const deleted = await db.delete(clients)
      .where(eq(clients.id, parseInt(id)))
      .returning();
    
    // UAT: Handle better-auth string IDs for audit logs
    const auditUserId = safeParseUserId(authResult.userId);
    
    // Log audit trail
    await db.insert(auditLogs).values({
      tableName: 'clients',
      recordId: parseInt(id),
      action: 'DELETE',
      oldValues: deleted[0],
      newValues: null,
      userId: auditUserId,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      message: 'Client deleted successfully',
      client: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}