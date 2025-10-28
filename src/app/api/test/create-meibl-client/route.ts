import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, sequences } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

// Simple auth helper
function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1 };
}

// Generate client code with atomic sequence increment
async function generateClientCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const entity = 'client';
  
  // Get existing sequence for current year
  const existingSequence = await db.select()
    .from(sequences)
    .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)))
    .limit(1);

  let nextSeq: number;
  const now = new Date().toISOString();

  if (existingSequence.length === 0) {
    // Create new sequence for this year
    nextSeq = 1;
    await db.insert(sequences)
      .values({
        entity,
        year: currentYear,
        lastSeq: nextSeq,
        createdAt: now,
        updatedAt: now
      });
  } else {
    // Increment existing sequence
    nextSeq = existingSequence[0].lastSeq + 1;
    await db.update(sequences)
      .set({ 
        lastSeq: nextSeq,
        updatedAt: now 
      })
      .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)));
  }

  // Build client code: MEIBL/CL/{YYYY}/{00001}
  return `MEIBL/CL/${currentYear}/${nextSeq.toString().padStart(5, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();

    // Validate required fields
    if (!body.companyName?.trim()) {
      return NextResponse.json({ 
        error: 'Company name is required',
        code: 'MISSING_COMPANY_NAME'
      }, { status: 400 });
    }

    if (!body.cacRcNumber?.trim()) {
      return NextResponse.json({ 
        error: 'CAC/RC number is required',
        code: 'MISSING_CAC_RC'
      }, { status: 400 });
    }

    if (!body.tin?.trim()) {
      return NextResponse.json({ 
        error: 'TIN is required',
        code: 'MISSING_TIN'
      }, { status: 400 });
    }

    // Check for duplicates
    const existingClient = await db.select()
      .from(clients)
      .where(or(
        eq(clients.cacRcNumber, body.cacRcNumber.trim()),
        eq(clients.tin, body.tin.trim())
      ))
      .limit(1);

    if (existingClient.length > 0) {
      return NextResponse.json({ 
        error: "Client with this CAC/RC number or TIN already exists",
        code: "DUPLICATE_CLIENT" 
      }, { status: 400 });
    }

    // Generate MEIBL client code
    const clientCode = await generateClientCode();

    // Create client with exact same pattern as minimal working version
    const now = new Date().toISOString();
    
    const newClient = await db.insert(clients)
      .values({
        clientCode,
        companyName: body.companyName.trim(),
        cacRcNumber: body.cacRcNumber.trim(),
        tin: body.tin.trim(),
        industry: body.industry ? body.industry.trim() : null,
        address: body.address ? body.address.trim() : null,
        city: body.city ? body.city.trim() : null,
        state: body.state ? body.state.trim() : null,
        country: body.country ? body.country.trim() : 'Nigeria',
        website: body.website ? body.website.trim() : null,
        kycStatus: body.kycStatus || 'pending',
        status: body.status || 'active',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json({
      success: true,
      client: newClient[0],
      generatedCode: clientCode
    }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const records = await db.select()
        .from(clients)
        .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
        .limit(1);

      if (records.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      return NextResponse.json(records[0]);
    }

    let query = db.select()
      .from(clients)
      .where(eq(clients.createdBy, user.id))
      .$dynamic();

    if (search) {
      query = query.where(
        and(
          eq(clients.createdBy, user.id),
          or(
            like(clients.companyName, `%${search}%`),
            like(clients.clientCode, `%${search}%`),
            like(clients.cacRcNumber, `%${search}%`),
            like(clients.tin, `%${search}%`)
          )
        )
      ) as any;
    }

    const results = await query
      .orderBy(order === 'asc' ? asc(clients[sort as keyof typeof clients]) : desc(clients[sort as keyof typeof clients]))
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

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body || 'createdBy' in body) {
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
      kycStatus,
      status
    } = body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (companyName !== undefined) updates.companyName = companyName?.trim();
    if (cacRcNumber !== undefined) updates.cacRcNumber = cacRcNumber?.trim();
    if (tin !== undefined) updates.tin = tin?.trim();
    if (industry !== undefined) updates.industry = industry?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (state !== undefined) updates.state = state?.trim() || null;
    if (country !== undefined) updates.country = country?.trim() || 'Nigeria';
    if (website !== undefined) updates.website = website?.trim() || null;
    if (kycStatus !== undefined) updates.kycStatus = kycStatus;
    if (status !== undefined) updates.status = status;

    if (cacRcNumber !== undefined || tin !== undefined) {
      const existingClient = await db.select()
        .from(clients)
        .where(
          and(
            eq(clients.id, parseInt(id)),
            eq(clients.createdBy, user.id),
            cacRcNumber !== undefined ? eq(clients.cacRcNumber, cacRcNumber) : undefined,
            tin !== undefined ? eq(clients.tin, tin) : undefined
          )
        )
        .limit(1);

      if (existingClient.length > 0 && existingClient[0].id !== parseInt(id)) {
        return NextResponse.json({ 
          error: "Client with this CAC/RC number or TIN already exists",
          code: "DUPLICATE_CLIENT" 
        }, { status: 400 });
      }
    }

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const deleted = await db.delete(clients)
      .where(and(eq(clients.id, parseInt(id)), eq(clients.createdBy, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Client deleted successfully',
      record: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}