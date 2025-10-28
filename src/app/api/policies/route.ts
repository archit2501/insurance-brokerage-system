import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, clients, insurers, lobs, subLobs, rfqs, users } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { nextEntityCode } from '../_lib/sequences';
import { authenticateToken, requireRole, VALID_ROLES, authenticateRequest } from '@/app/api/_lib/auth';

// Helper function to get applicable minimum premium from LOB/sub-LOB
async function getApplicableMinPremium(lobId: number, subLobId?: number | null): Promise<{ minPremium: number; brokeragePct: number; vatPct: number }> {
  // Get LOB defaults
  const lobResult = await db.select({
    minPremium: lobs.minPremium,
    defaultBrokeragePct: lobs.defaultBrokeragePct,
    defaultVatPct: lobs.defaultVatPct
  })
  .from(lobs)
  .where(eq(lobs.id, lobId))
  .limit(1);

  if (lobResult.length === 0) {
    throw new Error('LOB not found');
  }

  let minPremium = lobResult[0].minPremium;
  let brokeragePct = lobResult[0].defaultBrokeragePct;
  let vatPct = lobResult[0].defaultVatPct;

  // Check for sub-LOB overrides if subLobId is provided
  if (subLobId) {
    const subLobResult = await db.select({
      overrideMinPremium: subLobs.overrideMinPremium,
      overrideBrokeragePct: subLobs.overrideBrokeragePct,
      overrideVatPct: subLobs.overrideVatPct
    })
    .from(subLobs)
    .where(eq(subLobs.id, subLobId))
    .limit(1);

    if (subLobResult.length > 0) {
      const subLob = subLobResult[0];
      if (subLob.overrideMinPremium !== null) {
        minPremium = subLob.overrideMinPremium;
      }
      if (subLob.overrideBrokeragePct !== null) {
        brokeragePct = subLob.overrideBrokeragePct;
      }
      if (subLob.overrideVatPct !== null) {
        vatPct = subLob.overrideVatPct;
      }
    }
  }

  return { minPremium, brokeragePct, vatPct };
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('client_id') || '';
    const insurerId = searchParams.get('insurer_id') || '';
    const hasSlip = searchParams.get('has_slip') === 'true';

    let query = db.select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      clientId: policies.clientId,
      insurerId: policies.insurerId,
      lobId: policies.lobId,
      subLobId: policies.subLobId,
      sumInsured: policies.sumInsured,
      grossPremium: policies.grossPremium,
      currency: policies.currency,
      policyStartDate: policies.policyStartDate,
      policyEndDate: policies.policyEndDate,
      confirmationDate: policies.confirmationDate,
      status: policies.status,
      slipNumber: policies.slipNumber,
      slipStatus: policies.slipStatus,
      slipGeneratedAt: policies.slipGeneratedAt,
      slipValidUntil: policies.slipValidUntil,
      submittedToInsurerAt: policies.submittedToInsurerAt,
      insurerResponseAt: policies.insurerResponseAt,
      createdAt: policies.createdAt,
      updatedAt: policies.updatedAt,
      client: {
        id: clients.id,
        companyName: clients.companyName,
        kycStatus: clients.kycStatus,
        status: clients.status
      },
      insurer: {
        id: insurers.id,
        companyName: insurers.companyName,
        shortName: insurers.shortName,
        licenseNumber: insurers.licenseNumber,
        status: insurers.status
      },
      lob: {
        id: lobs.id,
        name: lobs.name,
        code: lobs.code,
        status: lobs.status
      },
      subLob: {
        id: subLobs.id,
        name: subLobs.name,
        code: subLobs.code,
        lobId: subLobs.lobId,
        status: subLobs.status
      },
      rfq: {
        id: rfqs.id,
        description: rfqs.description,
        status: rfqs.status,
        currency: rfqs.currency
      }
    })
    .from(policies)
    .leftJoin(clients, eq(policies.clientId, clients.id))
    .leftJoin(insurers, eq(policies.insurerId, insurers.id))
    .leftJoin(lobs, eq(policies.lobId, lobs.id))
    .leftJoin(subLobs, eq(policies.subLobId, subLobs.id))
    .leftJoin(rfqs, eq(policies.rfqId, rfqs.id));

    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(policies.policyNumber, `%${search}%`),
          like(clients.companyName, `%${search}%`)
        )
      );
    }
    
    if (status) {
      conditions.push(eq(policies.status, status));
    }
    
    if (clientId) {
      conditions.push(eq(policies.clientId, parseInt(clientId)));
    }
    
    if (insurerId) {
      conditions.push(eq(policies.insurerId, parseInt(insurerId)));
    }

    if (hasSlip) {
      conditions.push(isNotNull(policies.slipNumber));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(policies.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET policies error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
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
      clientId,
      insurerId,
      lobId,
      subLobId,
      sumInsured,
      grossPremium,
      policyStartDate,
      policyEndDate,
      rfqId,
      confirmationDate
    } = body;

    // Security: Reject if policy_number or policyNumber provided in request body
    if ('policy_number' in body || 'policyNumber' in body) {
      return NextResponse.json({ 
        error: "Policy number is auto-generated and cannot be provided in request body",
        code: "POLICY_NUMBER_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!clientId || !insurerId || !lobId || 
        sumInsured === undefined || grossPremium === undefined || 
        !policyStartDate || !policyEndDate) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Validate numeric fields
    if (isNaN(parseFloat(sumInsured)) || isNaN(parseFloat(grossPremium))) {
      return NextResponse.json({ 
        error: 'Sum insured and gross premium must be valid numbers',
        code: 'INVALID_NUMERIC_VALUES'
      }, { status: 400 });
    }

    // Validate dates - allow past, current and future dates for UAT
    const startDate = new Date(policyStartDate);
    const endDate = new Date(policyEndDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }
    
    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'Policy start date must be before end date',
        code: 'INVALID_DATE_RANGE'
      }, { status: 400 });
    }
    
    // UAT: Allow past dates for testing historical policies
    // TODO: For production, uncomment below to prevent past dates
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // const policyStart = new Date(policyStartDate);
    // policyStart.setHours(0, 0, 0, 0);
    // if (policyStart < today) {
    //   return NextResponse.json({ 
    //     error: 'Policy start date cannot be in the past',
    //     code: 'PAST_START_DATE'
    //   }, { status: 400 });
    // }

    // Get applicable minimum premium and defaults from LOB/sub-LOB
    let applicableDefaults;
    try {
      applicableDefaults = await getApplicableMinPremium(parseInt(lobId), subLobId ? parseInt(subLobId) : null);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid LOB or sub-LOB',
        code: 'INVALID_LOB_SUBLOB'
      }, { status: 400 });
    }

    // Enforce minimum premium rule
    const grossPremiumValue = parseFloat(grossPremium);
    if (grossPremiumValue < applicableDefaults.minPremium) {
      return NextResponse.json({ 
        error: 'Gross premium below minimum for selected LOB/Sub-LOB',
        code: 'BELOW_MIN_PREMIUM',
        minPremium: applicableDefaults.minPremium,
        providedPremium: grossPremiumValue
      }, { status: 422 });
    }

    // Generate policy number using centralized service
    const { code: policyNumber } = await nextEntityCode(db, { 
      entity: 'POLICY'
    });

    // Validate foreign keys
    const client = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(clientId)))
      .limit(1);
    
    if (client.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 400 });
    }

    const insurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(insurerId)))
      .limit(1);
    
    if (insurer.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: 'INSURER_NOT_FOUND'
      }, { status: 400 });
    }

    const lob = await db.select()
      .from(lobs)
      .where(eq(lobs.id, parseInt(lobId)))
      .limit(1);
    
    if (lob.length === 0) {
      return NextResponse.json({ 
        error: 'Line of business not found',
        code: 'LOB_NOT_FOUND'
      }, { status: 400 });
    }

    // Validate sub-LOB if provided
    if (subLobId) {
      const subLob = await db.select()
        .from(subLobs)
        .where(and(
          eq(subLobs.id, parseInt(subLobId)),
          eq(subLobs.lobId, parseInt(lobId))
        ))
        .limit(1);
      
      if (subLob.length === 0) {
        return NextResponse.json({ 
          error: 'Sub-LOB not found or does not belong to the specified LOB',
          code: 'SUB_LOB_NOT_FOUND'
        }, { status: 400 });
      }
    }

    // Validate RFQ if provided
    if (rfqId) {
      const rfq = await db.select()
        .from(rfqs)
        .where(eq(rfqs.id, parseInt(rfqId)))
        .limit(1);
      
      if (rfq.length === 0) {
        return NextResponse.json({ 
          error: 'RFQ not found',
          code: 'RFQ_NOT_FOUND'
        }, { status: 400 });
      }
    }

    // Get user ID from headers for audit tracking
    // Note: Better-auth uses string UUIDs, but policies.created_by is INTEGER
    // For now, we'll set it to null if it's a string UUID (better-auth user)
    const userIdHeader = request.headers.get('x-user-id');
    let createdBy: number | null = null;
    
    if (userIdHeader) {
      const parsedUserId = parseInt(userIdHeader, 10);
      // Only use the ID if it's a valid finite number (old users table)
      // String UUIDs from better-auth will result in NaN, which we'll treat as null
      if (!isNaN(parsedUserId) && isFinite(parsedUserId)) {
        createdBy = parsedUserId;
      }
      // If it's a string UUID (better-auth), createdBy remains null
      // This is acceptable for UAT as the system supports both auth systems
    }

    // Create policy with validated minimum premium
    const newPolicy = await db.insert(policies)
      .values({
        policyNumber,
        clientId: parseInt(clientId),
        insurerId: parseInt(insurerId),
        lobId: parseInt(lobId),
        subLobId: subLobId ? parseInt(subLobId) : null,
        rfqId: rfqId ? parseInt(rfqId) : null,
        sumInsured: parseFloat(sumInsured),
        grossPremium: parseFloat(grossPremium),
        currency: 'NGN',
        policyStartDate,
        policyEndDate,
        confirmationDate: confirmationDate || null,
        status: 'active',
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newPolicy[0], { status: 201 });
  } catch (error) {
    console.error('POST policies error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
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
      return NextResponse.json({ error: 'Valid policy ID is required', code: 'INVALID_ID' }, { status: 400 });
    }

    const body = await request.json();

    // Prevent policy number mutation
    if ('policy_number' in body || 'policyNumber' in body) {
      return NextResponse.json({ 
        error: 'Policy number cannot be modified',
        code: 'POLICY_NUMBER_IMMUTABLE' 
      }, { status: 400 });
    }

    // Load existing policy
    const existing = await db.select().from(policies).where(eq(policies.id, parseInt(id))).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Policy not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const updates: any = {};

    // Allowed updatable fields
    const {
      clientId,
      insurerId,
      lobId,
      subLobId,
      sumInsured,
      grossPremium,
      policyStartDate,
      policyEndDate,
      rfqId,
      confirmationDate,
      status
    } = body;

    if (clientId !== undefined) updates.clientId = parseInt(clientId);
    if (insurerId !== undefined) updates.insurerId = parseInt(insurerId);
    if (lobId !== undefined) updates.lobId = parseInt(lobId);
    if (subLobId !== undefined) updates.subLobId = subLobId ? parseInt(subLobId) : null;
    if (sumInsured !== undefined) {
      if (isNaN(parseFloat(sumInsured))) {
        return NextResponse.json({ error: 'sumInsured must be a number', code: 'INVALID_NUMERIC_VALUES' }, { status: 400 });
      }
      updates.sumInsured = parseFloat(sumInsured);
    }
    if (grossPremium !== undefined) {
      if (isNaN(parseFloat(grossPremium))) {
        return NextResponse.json({ error: 'grossPremium must be a number', code: 'INVALID_NUMERIC_VALUES' }, { status: 400 });
      }
      updates.grossPremium = parseFloat(grossPremium);
    }
    if (policyStartDate !== undefined) {
      const d = new Date(policyStartDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid policyStartDate', code: 'INVALID_DATE_FORMAT' }, { status: 400 });
      // UAT: Allow past dates for testing
      // const today = new Date(); today.setHours(0,0,0,0);
      // const d0 = new Date(policyStartDate); d0.setHours(0,0,0,0);
      // if (d0 < today) return NextResponse.json({ error: 'Policy start date cannot be in the past', code: 'PAST_START_DATE' }, { status: 400 });
      updates.policyStartDate = policyStartDate;
    }
    if (policyEndDate !== undefined) {
      const d = new Date(policyEndDate);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid policyEndDate', code: 'INVALID_DATE_FORMAT' }, { status: 400 });
      updates.policyEndDate = policyEndDate;
    }
    if (confirmationDate !== undefined) updates.confirmationDate = confirmationDate || null;
    if (rfqId !== undefined) updates.rfqId = rfqId ? parseInt(rfqId) : null;
    if (status !== undefined) updates.status = status;

    // If both start and end provided or existing start present, ensure range valid
    const start = updates.policyStartDate ?? existing[0].policyStartDate;
    const end = updates.policyEndDate ?? existing[0].policyEndDate;
    if (start && end) {
      if (new Date(start) >= new Date(end)) {
        return NextResponse.json({ error: 'Policy start date must be before end date', code: 'INVALID_DATE_RANGE' }, { status: 400 });
      }
    }

    // Determine effective LOB/Sub-LOB for min premium validation
    const effLobId = updates.lobId ?? existing[0].lobId;
    const effSubLobId = updates.subLobId === undefined ? existing[0].subLobId : updates.subLobId;

    // Determine effective grossPremium for validation
    const effGross = updates.grossPremium !== undefined ? updates.grossPremium : existing[0].grossPremium;

    // Enforce minimum premium using applicable defaults
    try {
      const { minPremium } = await getApplicableMinPremium(parseInt(effLobId), effSubLobId ? parseInt(effSubLobId) : null);
      if (effGross < minPremium) {
        return NextResponse.json({
          error: 'Gross premium below minimum for selected LOB/Sub-LOB',
          code: 'BELOW_MIN_PREMIUM',
          minPremium,
          providedPremium: effGross
        }, { status: 422 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid LOB or sub-LOB', code: 'INVALID_LOB_SUBLOB' }, { status: 400 });
    }

    // Foreign key checks if IDs changed
    if (updates.clientId !== undefined) {
      const chk = await db.select().from(clients).where(eq(clients.id, updates.clientId)).limit(1);
      if (chk.length === 0) return NextResponse.json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' }, { status: 400 });
    }
    if (updates.insurerId !== undefined) {
      const chk = await db.select().from(insurers).where(eq(insurers.id, updates.insurerId)).limit(1);
      if (chk.length === 0) return NextResponse.json({ error: 'Insurer not found', code: 'INSURER_NOT_FOUND' }, { status: 400 });
    }
    if (updates.lobId !== undefined) {
      const chk = await db.select().from(lobs).where(eq(lobs.id, updates.lobId)).limit(1);
      if (chk.length === 0) return NextResponse.json({ error: 'Line of business not found', code: 'LOB_NOT_FOUND' }, { status: 400 });
    }
    if (updates.subLobId !== undefined && updates.subLobId !== null) {
      const chk = await db.select().from(subLobs).where(and(eq(subLobs.id, updates.subLobId), eq(subLobs.lobId, effLobId))).limit(1);
      if (chk.length === 0) return NextResponse.json({ error: 'Sub-LOB not found or does not belong to the specified LOB', code: 'SUB_LOB_NOT_FOUND' }, { status: 400 });
    }
    if (updates.rfqId !== undefined && updates.rfqId !== null) {
      const chk = await db.select().from(rfqs).where(eq(rfqs.id, updates.rfqId)).limit(1);
      if (chk.length === 0) return NextResponse.json({ error: 'RFQ not found', code: 'RFQ_NOT_FOUND' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(policies)
      .set(updates)
      .where(eq(policies.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT policies error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}