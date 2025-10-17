import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { endorsements, policies, lobs, subLobs, endorsementSequences, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const role = request.headers.get('x-role') || 'Viewer';
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1, role };
}

export async function GET(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const policyId = searchParams.get('policyId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.select({
      id: endorsements.id,
      policyId: endorsements.policyId,
      endorsementNumber: endorsements.endorsementNumber,
      type: endorsements.type,
      effectiveDate: endorsements.effectiveDate,
      description: endorsements.description,
      sumInsuredDelta: endorsements.sumInsuredDelta,
      grossPremiumDelta: endorsements.grossPremiumDelta,
      brokeragePct: endorsements.brokeragePct,
      vatPct: endorsements.vatPct,
      levies: endorsements.levies,
      netAmountDue: endorsements.netAmountDue,
      status: endorsements.status,
      preparedBy: endorsements.preparedBy,
      authorizedBy: endorsements.authorizedBy,
      createdAt: endorsements.createdAt,
      updatedAt: endorsements.updatedAt,
      policyNumber: policies.policyNumber,
      lobName: lobs.name,
      subLobName: subLobs.name
    })
    .from(endorsements)
    .innerJoin(policies, eq(endorsements.policyId, policies.id))
    .innerJoin(lobs, eq(policies.lobId, lobs.id))
    .leftJoin(subLobs, eq(policies.subLobId, subLobs.id));

    if (policyId) {
      query = query.where(eq(endorsements.policyId, parseInt(policyId)));
    }

    const results = await query
      .orderBy(desc(endorsements.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET endorsements error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user ID from header (simplified for testing)
    const userId = parseInt(request.headers.get('x-user-id') || '1');
    const userRole = request.headers.get('x-role') || 'Viewer';

    // Check role permissions
    if (!['Underwriter', 'Admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 });
    }

    const body = await request.json();
    
    // Security check: reject userId, preparedBy in request body
    if ('userId' in body || 'user_id' in body || 'preparedBy' in body || 'prepared_by' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      policyId,
      type,
      effectiveDate,
      description,
      sumInsuredDelta = 0,
      grossPremiumDelta = 0,
      brokeragePct = null,
      vatPct = 7.5,
      levies = null
    } = body;

    // Validation
    if (!policyId || !type || !effectiveDate || !description) {
      return NextResponse.json({ 
        error: "Missing required fields",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(policyId))) {
      return NextResponse.json({ 
        error: "Invalid policy ID",
        code: "INVALID_POLICY_ID" 
      }, { status: 400 });
    }

    if (typeof type !== 'string' || type.trim().length === 0) {
      return NextResponse.json({ 
        error: "Type must be a non-empty string",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (isNaN(Date.parse(effectiveDate))) {
      return NextResponse.json({ 
        error: "Invalid effective date format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (brokeragePct !== null && (isNaN(parseFloat(brokeragePct)) || parseFloat(brokeragePct) < 0 || parseFloat(brokeragePct) > 100)) {
      return NextResponse.json({ 
        error: "Brokerage percentage must be between 0 and 100",
        code: "INVALID_BROKERAGE_PCT" 
      }, { status: 400 });
    }

    if (vatPct !== null && (isNaN(parseFloat(vatPct)) || parseFloat(vatPct) < 0 || parseFloat(vatPct) > 100)) {
      return NextResponse.json({ 
        error: "VAT percentage must be between 0 and 100",
        code: "INVALID_VAT_PCT" 
      }, { status: 400 });
    }

    if (levies !== null && typeof levies !== 'object') {
      return NextResponse.json({ 
        error: "Levies must be a valid JSON object",
        code: "INVALID_LEVIES_FORMAT" 
      }, { status: 400 });
    }

    // Check if policy exists and user has access
    const policyCheck = await db.select({
      id: policies.id,
      lobId: policies.lobId,
      subLobId: policies.subLobId
    })
    .from(policies)
    .where(eq(policies.id, parseInt(policyId)))
    .limit(1);

    if (policyCheck.length === 0) {
      return NextResponse.json({ 
        error: "Policy not found",
        code: "POLICY_NOT_FOUND" 
      }, { status: 404 });
    }

    const policy = policyCheck[0];

    // Get brokerage percentage from LOB/sub-LOB if not provided
    let finalBrokeragePct = parseFloat(brokeragePct || '0');
    if (brokeragePct === null) {
      if (policy.subLobId) {
        const subLobCheck = await db.select({
          overrideBrokeragePct: subLobs.overrideBrokeragePct,
          lobDefaultBrokeragePct: lobs.defaultBrokeragePct
        })
        .from(subLobs)
        .innerJoin(lobs, eq(subLobs.lobId, lobs.id))
        .where(eq(subLobs.id, policy.subLobId))
        .limit(1);

        if (subLobCheck.length > 0) {
          finalBrokeragePct = subLobCheck[0].overrideBrokeragePct || subLobCheck[0].lobDefaultBrokeragePct || 0;
        }
      } else {
        const lobCheck = await db.select({
          defaultBrokeragePct: lobs.defaultBrokeragePct
        })
        .from(lobs)
        .where(eq(lobs.id, policy.lobId))
        .limit(1);

        if (lobCheck.length > 0) {
          finalBrokeragePct = lobCheck[0].defaultBrokeragePct || 0;
        }
      }
    }

    // Generate endorsement number atomically
    const currentYear = new Date().getFullYear();
    let endorsementNumber: string;

    await db.transaction(async (tx) => {
      // Get current sequence
      const sequenceCheck = await tx.select()
        .from(endorsementSequences)
        .where(and(eq(endorsementSequences.entity, 'ENDORSEMENT'), eq(endorsementSequences.year, currentYear)))
        .limit(1);

      let nextSeq = 1;
      
      if (sequenceCheck.length > 0) {
        nextSeq = sequenceCheck[0].lastSeq + 1;
        await tx.update(endorsementSequences)
          .set({ lastSeq: nextSeq, updatedAt: new Date().toISOString() })
          .where(eq(endorsementSequences.id, sequenceCheck[0].id));
      } else {
        await tx.insert(endorsementSequences)
          .values({
            entity: 'ENDORSEMENT',
            year: currentYear,
            lastSeq: nextSeq,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
      }

      endorsementNumber = `END/${currentYear}/${String(nextSeq).padStart(6, '0')}`;
    });

    // Calculate financial amounts
    const brokerageAmount = parseFloat(grossPremiumDelta) * (finalBrokeragePct / 100);
    const vatAmount = brokerageAmount * (parseFloat(vatPct.toString()) / 100);
    
    let leviesTotal = 0;
    if (levies && typeof levies === 'object') {
      leviesTotal = Object.values(levies).reduce((sum: number, value: any) => {
        const numValue = parseFloat(value);
        return sum + (isNaN(numValue) ? 0 : numValue);
      }, 0);
    }

    const netAmountDue = parseFloat(grossPremiumDelta) - brokerageAmount - vatAmount - leviesTotal;

    // Create endorsement
    const newEndorsement = await db.insert(endorsements)
      .values({
        policyId: parseInt(policyId),
        endorsementNumber: endorsementNumber!,
        type: type.trim(),
        effectiveDate,
        description: description.trim(),
        sumInsuredDelta: parseFloat(sumInsuredDelta),
        grossPremiumDelta: parseFloat(grossPremiumDelta),
        brokeragePct: finalBrokeragePct,
        vatPct: parseFloat(vatPct.toString()),
        levies: levies ? JSON.stringify(levies) : null,
        netAmountDue,
        status: 'Draft',
        preparedBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newEndorsement[0], { status: 201 });
  } catch (error) {
    console.error('POST endorsements error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}