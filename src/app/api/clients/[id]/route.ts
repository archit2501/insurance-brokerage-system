import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, users } from '@/db/schema';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';

// Simple auth helper
async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1 };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

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
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt
      })
        .from(clients)
        .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
        .limit(1);

      if (client.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      return NextResponse.json(client[0]);
    }

    let query = db.select({
      id: clients.id,
      clientCode: clients.clientCode,
      companyName: clients.companyName,
      cacRcNumber: clients.cacRcNumber,
      tin: clients.tin,
      industry: clients.industry,
      city: clients.city,
      state: clients.state,
      kycStatus: clients.kycStatus,
      status: clients.status,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    })
    .from(clients)
    .where(eq(clients.createdBy, user.id));

    if (search) {
      query = query.where(
        and(
          eq(clients.createdBy, user.id),
          or(
            like(clients.companyName, `%${search}%`),
            like(clients.cacRcNumber, `%${search}%`),
            like(clients.tin, `%${search}%`),
            like(clients.clientCode, `%${search}%`)
          )
        )
      );
    }

    const orderBy = order === 'asc' ? asc(clients[sort]) : desc(clients[sort]);
    const results = await query
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    
    // Security check: reject if user identifier fields provided
    if ('userId' in body || 'user_id' in body || 'createdBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      companyName,
      cacRcNumber,
      tin,
      industry,
      address,
      city,
      state,
      country,
      website,
      kycStatus
    } = body;

    // Validate required fields
    if (!companyName?.trim()) {
      return NextResponse.json({ 
        error: "Company name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!cacRcNumber?.trim()) {
      return NextResponse.json({ 
        error: "CAC/RC number is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!tin?.trim()) {
      return NextResponse.json({ 
        error: "TIN is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate uniqueness
    const existingCacRc = await db.select()
      .from(clients)
      .where(eq(clients.cacRcNumber, cacRcNumber.trim()))
      .limit(1);

    if (existingCacRc.length > 0) {
      return NextResponse.json({ 
        error: "CAC/RC number already exists",
        code: "DUPLICATE_CAC_RC" 
      }, { status: 400 });
    }

    const existingTin = await db.select()
      .from(clients)
      .where(eq(clients.tin, tin.trim()))
      .limit(1);

    if (existingTin.length > 0) {
      return NextResponse.json({ 
        error: "TIN already exists",
        code: "DUPLICATE_TIN" 
      }, { status: 400 });
    }

    const currentTime = new Date().toISOString();

    const newClient = await db.insert(clients)
      .values({
        companyName: companyName.trim(),
        cacRcNumber: cacRcNumber.trim().toUpperCase(),
        tin: tin.trim().toUpperCase(),
        industry: industry?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || 'Nigeria',
        website: website?.trim() || null,
        kycStatus: kycStatus || 'pending',
        status: 'active',
        createdBy: user.id,
        createdAt: currentTime,
        updatedAt: currentTime
      })
      .returning();

    return NextResponse.json(newClient[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    
    // Security check: reject if user identifier fields provided
    if ('userId' in body || 'user_id' in body || 'createdBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      companyName,
      industry,
      address,
      city,
      state,
      website,
      kycStatus,
      status,
      cacRcNumber,
      tin
    } = body;

    // Build update object
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName?.trim();
    if (industry !== undefined) updates.industry = industry?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (state !== undefined) updates.state = state?.trim() || null;
    if (website !== undefined) updates.website = website?.trim() || null;
    if (kycStatus !== undefined) updates.kycStatus = kycStatus;
    if (status !== undefined) updates.status = status;

    // Validate CAC/RC uniqueness if provided
    if (cacRcNumber !== undefined) {
      const existingCacRc = await db.select()
        .from(clients)
        .where(and(eq(clients.cacRcNumber, cacRcNumber.trim()), eq(clients.id, parseInt(id))))
        .limit(1);

      if (existingCacRc.length === 0) {
        const duplicateCheck = await db.select()
          .from(clients)
          .where(eq(clients.cacRcNumber, cacRcNumber.trim()))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return NextResponse.json({ 
            error: "CAC/RC number already exists",
            code: "DUPLICATE_CAC_RC" 
          }, { status: 400 });
        }
      }

      updates.cacRcNumber = cacRcNumber.trim().toUpperCase();
    }

    // Validate TIN uniqueness if provided
    if (tin !== undefined) {
      const existingTin = await db.select()
        .from(clients)
        .where(and(eq(clients.tin, tin.trim()), eq(clients.id, parseInt(id))))
        .limit(1);

      if (existingTin.length === 0) {
        const duplicateCheck = await db.select()
          .from(clients)
          .where(eq(clients.tin, tin.trim()))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return NextResponse.json({ 
            error: "TIN already exists",
            code: "DUPLICATE_TIN" 
          }, { status: 400 });
        }
      }

      updates.tin = tin.trim().toUpperCase();
    }

    // Check if client exists and belongs to user
    const existingClient = await db.select()
      .from(clients)
      .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
      .limit(1);

    if (existingClient.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(clients)
      .set(updates)
      .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if client exists and belongs to user
    const existingClient = await db.select()
      .from(clients)
      .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
      .limit(1);

    if (existingClient.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const deleted = await db.update(clients)
      .set({ 
        status: 'inactive',
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Client deactivated successfully',
      client: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}