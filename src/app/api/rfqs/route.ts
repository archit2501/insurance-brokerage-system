import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfqs, clients, lobs, subLobs, users } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import { authenticateRequest } from '@/app/api/_lib/auth';

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
    const client_id = searchParams.get('client_id');
    const created_by = searchParams.get('created_by');

    let query = db.select({
      id: rfqs.id,
      clientId: rfqs.clientId,
      primaryLobId: rfqs.primaryLobId,
      subLobId: rfqs.subLobId,
      description: rfqs.description,
      expectedSumInsured: rfqs.expectedSumInsured,
      expectedGrossPremium: rfqs.expectedGrossPremium,
      currency: rfqs.currency,
      targetRatePct: rfqs.targetRatePct,
      status: rfqs.status,
      selectedInsurerId: rfqs.selectedInsurerId,
      createdBy: rfqs.createdBy,
      createdAt: rfqs.createdAt,
      updatedAt: rfqs.updatedAt,
      client: {
        id: clients.id,
        companyName: clients.companyName,
      },
      primaryLob: {
        id: lobs.id,
        name: lobs.name,
        code: lobs.code,
      },
      subLob: {
        id: subLobs.id,
        name: subLobs.name,
        code: subLobs.code,
      },
      creator: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
      .from(rfqs)
      .leftJoin(clients, eq(rfqs.clientId, clients.id))
      .leftJoin(lobs, eq(rfqs.primaryLobId, lobs.id))
      .leftJoin(subLobs, eq(rfqs.subLobId, subLobs.id))
      .leftJoin(users, eq(rfqs.createdBy, users.id));

    const conditions = [];

    if (search) {
      conditions.push(like(rfqs.description, `%${search}%`));
    }

    if (status && ['Draft', 'Quoted', 'Won', 'Lost', 'ConvertedToPolicy'].includes(status)) {
      conditions.push(eq(rfqs.status, status));
    }

    if (client_id && !isNaN(parseInt(client_id))) {
      conditions.push(eq(rfqs.clientId, parseInt(client_id)));
    }

    if (created_by && !isNaN(parseInt(created_by))) {
      conditions.push(eq(rfqs.createdBy, parseInt(created_by)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(rfqs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
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
      clientId,
      primaryLobId,
      subLobId,
      description,
      expectedSumInsured,
      expectedGrossPremium,
      currency,
      targetRatePct,
    } = body;

    const xUserId = request.headers.get('x-user-id');

    if (!clientId || !primaryLobId || !description || !expectedSumInsured || !expectedGrossPremium || !currency) {
      return NextResponse.json({
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELD'
      }, { status: 400 });
    }

    if (isNaN(parseInt(clientId)) || isNaN(parseInt(primaryLobId))) {
      return NextResponse.json({
        error: 'Invalid clientId or primaryLobId',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    if (subLobId && isNaN(parseInt(subLobId))) {
      return NextResponse.json({
        error: 'Invalid subLobId',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const clientExists = await db.select().from(clients).where(eq(clients.id, parseInt(clientId))).limit(1);
    if (clientExists.length === 0) {
      return NextResponse.json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 400 });
    }

    const lobExists = await db.select().from(lobs).where(eq(lobs.id, parseInt(primaryLobId))).limit(1);
    if (lobExists.length === 0) {
      return NextResponse.json({
        error: 'Primary LOB not found',
        code: 'LOB_NOT_FOUND'
      }, { status: 400 });
    }

    if (subLobId) {
      const subLobExists = await db.select().from(subLobs).where(eq(subLobs.id, parseInt(subLobId))).limit(1);
      if (subLobExists.length === 0) {
        return NextResponse.json({
          error: 'Sub LOB not found',
          code: 'SUB_LOB_NOT_FOUND'
        }, { status: 400 });
      }
    }

    const createdBy = xUserId ? parseInt(xUserId) : null;

    const newRfq = await db.insert(rfqs).values({
      clientId: parseInt(clientId),
      primaryLobId: parseInt(primaryLobId),
      subLobId: subLobId ? parseInt(subLobId) : null,
      description: description.trim(),
      expectedSumInsured: parseFloat(expectedSumInsured),
      expectedGrossPremium: parseFloat(expectedGrossPremium),
      currency: currency.trim().toUpperCase(),
      targetRatePct: targetRatePct ? parseFloat(targetRatePct) : null,
      status: 'Draft',
      createdBy: createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newRfq[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}