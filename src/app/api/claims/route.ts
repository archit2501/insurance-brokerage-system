import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims, claimSequences, policies, clients, users } from '@/db/schema';
import { eq, and, like, or, desc, gte, lte, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/claims - List claims with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const policyId = searchParams.get('policyId');
    const adjusterAssignedId = searchParams.get('adjusterAssignedId');
    const lossDateFrom = searchParams.get('lossDateFrom');
    const lossDateTo = searchParams.get('lossDateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.select({
      claim: claims,
      policy: {
        id: policies.id,
        policyNumber: policies.policyNumber,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium,
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
      },
      adjuster: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(claims)
    .leftJoin(policies, eq(claims.policyId, policies.id))
    .leftJoin(clients, eq(policies.clientId, clients.id))
    .leftJoin(users, eq(claims.adjusterAssignedId, users.id));

    const conditions = [] as any[];

    if (search) {
      conditions.push(
        or(
          like(claims.claimNumber, `%${search}%`),
          like(claims.claimantName, `%${search}%`),
          like(claims.lossDescription, `%${search}%`)
        )
      );
    }

    if (status) {
      const statusArray = status.split(',');
      conditions.push(inArray(claims.status, statusArray));
    }

    if (priority) {
      conditions.push(eq(claims.priority, priority));
    }

    if (policyId) {
      conditions.push(eq(claims.policyId, parseInt(policyId)));
    }

    if (adjusterAssignedId) {
      conditions.push(eq(claims.adjusterAssignedId, parseInt(adjusterAssignedId)));
    }

    if (lossDateFrom) {
      conditions.push(gte(claims.lossDate, lossDateFrom));
    }

    if (lossDateTo) {
      conditions.push(lte(claims.lossDate, lossDateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query
      .orderBy(desc(claims.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('GET /api/claims error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch claims' }, { status: 500 });
  }
}

// POST /api/claims - Register new claim
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      policyId,
      claimantName,
      claimantPhone,
      claimantEmail,
      lossDate,
      reportedDate = new Date().toISOString().split('T')[0],
      lossLocation,
      lossDescription,
      claimAmount,
      priority = 'Medium',
      currency = 'NGN',
      exchangeRate = 1.0,
    } = body;

    // Validation
    if (!policyId || !claimantName || !lossDate || !lossDescription || !claimAmount) {
      return NextResponse.json({
        error: 'policyId, claimantName, lossDate, lossDescription, and claimAmount are required'
      }, { status: 400 });
    }

    if (parseFloat(claimAmount) <= 0) {
      return NextResponse.json({ error: 'claimAmount must be positive' }, { status: 400 });
    }

    // Verify policy exists
    const [policy] = await db.select()
      .from(policies)
      .where(eq(policies.id, parseInt(policyId)))
      .limit(1);

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Check if loss date is within policy period
    if (lossDate < policy.policyStartDate || lossDate > policy.policyEndDate) {
      return NextResponse.json({
        error: `Loss date must be within policy period (${policy.policyStartDate} to ${policy.policyEndDate})`
      }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const now = new Date().toISOString();

    // Look up user by email to get integer ID for registeredBy field
    let registeredBy: number | null = null;
    const userEmail = session.user.email;
    if (userEmail) {
      const userResult = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (userResult.length > 0) {
        registeredBy = userResult[0].id;
      }
    }

    // Use transaction to generate claim number
    const created = await db.transaction(async (tx) => {
      // Get or create sequence
      let sequence = await tx.select()
        .from(claimSequences)
        .where(eq(claimSequences.year, currentYear))
        .limit(1);

      let nextSeq = 1;
      if (sequence.length > 0) {
        nextSeq = sequence[0].lastSeq + 1;
        await tx.update(claimSequences)
          .set({ lastSeq: nextSeq, updatedAt: now })
          .where(eq(claimSequences.year, currentYear));
      } else {
        await tx.insert(claimSequences)
          .values({ year: currentYear, lastSeq: nextSeq, createdAt: now, updatedAt: now });
      }

      const claimNumber = `CLM/${currentYear}/${String(nextSeq).padStart(6, '0')}`;

      const claimData = {
        claimNumber,
        policyId: parseInt(policyId),
        claimantName,
        claimantPhone: claimantPhone || null,
        claimantEmail: claimantEmail || null,
        lossDate,
        reportedDate,
        lossLocation: lossLocation || null,
        lossDescription,
        claimAmount: parseFloat(claimAmount),
        estimatedLoss: null,
        approvedAmount: null,
        settlementAmount: null,
        status: 'Registered',
        priority,
        adjusterAssignedId: null,
        assignedDate: null,
        investigationNotes: null,
        rejectionReason: null,
        settlementDate: null,
        closedDate: null,
        closureReason: null,
        currency,
        exchangeRate: parseFloat(String(exchangeRate)),
        registeredBy,
        approvedBy: null,
        createdAt: now,
        updatedAt: now,
      };

      const inserted = await tx.insert(claims).values(claimData).returning();
      return inserted[0];
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/claims error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create claim' }, { status: 500 });
  }
}

// PUT /api/claims - Update claim
export async function PUT(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Claim id is required' }, { status: 400 });
    }

    // Check if claim exists
    const [existing] = await db.select()
      .from(claims)
      .where(eq(claims.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const [updated] = await db.update(claims)
      .set({ ...updates, updatedAt: now })
      .where(eq(claims.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/claims error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update claim' }, { status: 500 });
  }
}
