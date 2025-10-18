import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { endorsements, endorsementSequences, policies, users, subLobs, lobs } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Simple auth helper
function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const role = request.headers.get('x-role') || 'Viewer';
  const userId = request.headers.get('x-user-id');
  const approvalLevel = request.headers.get('x-approval-level');
  return { 
    id: userId ? parseInt(userId) : null, 
    role, 
    approvalLevel: approvalLevel ? parseInt(approvalLevel.replace('L', '')) : null 
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const policyId = parseInt(id);
    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID', code: 'INVALID_POLICY_ID' }, { status: 400 });
    }

    // Check if policy exists
    const policy = await db.select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (policy.length === 0) {
      return NextResponse.json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const endorsementsList = await db.select({
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
      preparedByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
      authorizedByUser: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
      .from(endorsements)
      .leftJoin(users, eq(endorsements.preparedBy, users.id))
      .where(eq(endorsements.policyId, policyId))
      .orderBy(desc(endorsements.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(endorsementsList);
  } catch (error) {
    console.error('GET endorsements error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check role permissions for creating endorsements
    const allowedRoles = ['Underwriter', 'Admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 });
    }

    const policyId = parseInt(id);
    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID', code: 'INVALID_POLICY_ID' }, { status: 400 });
    }

    // Check if policy exists
    const policy = await db.select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (policy.length === 0) {
      return NextResponse.json({ error: 'Policy not found', code: 'POLICY_NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['type', 'effectiveDate', 'description', 'sumInsuredDelta', 'grossPremiumDelta'];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ 
          error: `${field} is required`, 
          code: 'MISSING_REQUIRED_FIELD' 
        }, { status: 400 });
      }
    }

    // Validate field types and formats
    if (typeof body.type !== 'string' || body.type.trim() === '') {
      return NextResponse.json({ 
        error: 'type must be a non-empty string', 
        code: 'INVALID_TYPE' 
      }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.effectiveDate)) {
      return NextResponse.json({ 
        error: 'effectiveDate must be in YYYY-MM-DD format', 
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    if (typeof body.description !== 'string' || body.description.trim() === '') {
      return NextResponse.json({ 
        error: 'description must be a non-empty string', 
        code: 'INVALID_DESCRIPTION' 
      }, { status: 400 });
    }

    if (typeof body.sumInsuredDelta !== 'number' || typeof body.grossPremiumDelta !== 'number') {
      return NextResponse.json({ 
        error: 'sumInsuredDelta and grossPremiumDelta must be numbers', 
        code: 'INVALID_NUMBER_FIELDS' 
      }, { status: 400 });
    }

    // Validate optional fields if provided
    if (body.brokeragePct !== undefined && (typeof body.brokeragePct !== 'number' || body.brokeragePct < 0 || body.brokeragePct > 100)) {
      return NextResponse.json({ 
        error: 'brokeragePct must be between 0 and 100', 
        code: 'INVALID_BROKERAGE_PCT' 
      }, { status: 400 });
    }

    if (body.vatPct !== undefined && (typeof body.vatPct !== 'number' || body.vatPct < 0 || body.vatPct > 100)) {
      return NextResponse.json({ 
        error: 'vatPct must be between 0 and 100', 
        code: 'INVALID_VAT_PCT' 
      }, { status: 400 });
    }

    if (body.levies !== undefined && typeof body.levies !== 'object') {
      return NextResponse.json({ 
        error: 'levies must be a valid JSON object', 
        code: 'INVALID_LEVIES' 
      }, { status: 400 });
    }

    // Start transaction for atomic sequence generation
    const result = await db.transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      
      // Get or create sequence for current year
      let sequence = await tx.select()
        .from(endorsementSequences)
        .where(and(
          eq(endorsementSequences.entity, 'ENDORSEMENT'),
          eq(endorsementSequences.year, currentYear)
        ))
        .limit(1);

      let nextSeq = 1;
      
      if (sequence.length === 0) {
        // Create new sequence for the year
        await tx.insert(endorsementSequences).values({
          entity: 'ENDORSEMENT',
          year: currentYear,
          lastSeq: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Increment existing sequence
        nextSeq = sequence[0].lastSeq + 1;
        await tx.update(endorsementSequences)
          .set({ lastSeq: nextSeq, updatedAt: new Date().toISOString() })
          .where(eq(endorsementSequences.id, sequence[0].id));
      }

      // Generate endorsement number: END/{year}/{seq padded 6 digits}
      const endorsementNumber = `END/${currentYear}/${String(nextSeq).padStart(6, '0')}`;

      // Get policy details for brokerage/VAT defaults
      const policyDetails = await tx.select({
        subLobId: policies.subLobId,
        lobId: policies.lobId,
      })
        .from(policies)
        .where(eq(policies.id, policyId))
        .limit(1);

      let brokeragePct = body.brokeragePct;
      let vatPct = body.vatPct ?? 7.5;

      // Resolve brokerage percentage from sub-lob or lob defaults
      if (brokeragePct === undefined) {
        const subLob = await tx.select()
          .from(subLobs)
          .where(eq(subLobs.id, policyDetails[0].subLobId))
          .limit(1);

        if (subLob.length > 0 && subLob[0].overrideBrokeragePct !== null) {
          brokeragePct = subLob[0].overrideBrokeragePct;
        } else {
          const lob = await tx.select()
            .from(lobs)
            .where(eq(lobs.id, policyDetails[0].lobId))
            .limit(1);

          if (lob.length > 0) {
            brokeragePct = lob[0].defaultBrokeragePct;
          } else {
            brokeragePct = 0;
          }
        }
      }

      // Calculate derived fields
      const netBrokerage = (body.grossPremiumDelta * (brokeragePct / 100));
      const vatOnBrokerage = netBrokerage * (vatPct / 100);
      
      // Calculate levies sum
      const levies = body.levies || {};
      const leviesSum = Object.values(levies).reduce((sum: number, value) => sum + (Number(value) || 0), 0);
      
      const netAmountDue = body.grossPremiumDelta - netBrokerage - vatOnBrokerage - leviesSum;

      // Create endorsement
      const newEndorsement = await tx.insert(endorsements).values({
        policyId,
        endorsementNumber,
        type: body.type,
        effectiveDate: body.effectiveDate,
        description: body.description,
        sumInsuredDelta: body.sumInsuredDelta,
        grossPremiumDelta: body.grossPremiumDelta,
        brokeragePct,
        vatPct,
        levies: JSON.stringify(levies),
        netAmountDue,
        status: 'Draft',
        preparedBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();

      return newEndorsement[0];
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST endorsement error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}