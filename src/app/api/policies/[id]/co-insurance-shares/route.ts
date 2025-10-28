import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policyCoInsuranceShares, policies, insurers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    const shares = await db
      .select({
        id: policyCoInsuranceShares.id,
        policyId: policyCoInsuranceShares.policyId,
        insurerId: policyCoInsuranceShares.insurerId,
        sharePercentage: policyCoInsuranceShares.sharePercentage,
        insurer: {
          id: insurers.id,
          companyName: insurers.companyName,
          shortName: insurers.shortName,
        },
        createdAt: policyCoInsuranceShares.createdAt,
        updatedAt: policyCoInsuranceShares.updatedAt,
      })
      .from(policyCoInsuranceShares)
      .leftJoin(insurers, eq(policyCoInsuranceShares.insurerId, insurers.id))
      .where(eq(policyCoInsuranceShares.policyId, policyId));

    return NextResponse.json(shares);
  } catch (error) {
    console.error('Error fetching co-insurance shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch co-insurance shares' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    // Verify policy exists
    const policy = await db.select().from(policies).where(eq(policies.id, policyId)).limit(1);
    if (!policy.length) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const body = await request.json();

    if (!body.insurerId || !body.sharePercentage) {
      return NextResponse.json(
        { error: 'Insurer ID and share percentage required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newShare = await db.insert(policyCoInsuranceShares).values({
      policyId,
      insurerId: body.insurerId,
      sharePercentage: body.sharePercentage,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newShare[0], { status: 201 });
  } catch (error) {
    console.error('Error creating co-insurance share:', error);
    return NextResponse.json(
      { error: 'Failed to create co-insurance share' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.shareId || !body.sharePercentage) {
      return NextResponse.json(
        { error: 'Share ID and percentage required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const updated = await db
      .update(policyCoInsuranceShares)
      .set({
        sharePercentage: body.sharePercentage,
        updatedAt: now,
      })
      .where(
        and(
          eq(policyCoInsuranceShares.id, body.shareId),
          eq(policyCoInsuranceShares.policyId, policyId)
        )
      )
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating co-insurance share:', error);
    return NextResponse.json(
      { error: 'Failed to update co-insurance share' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (isNaN(policyId) || !shareId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await db
      .delete(policyCoInsuranceShares)
      .where(
        and(
          eq(policyCoInsuranceShares.id, parseInt(shareId)),
          eq(policyCoInsuranceShares.policyId, policyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting co-insurance share:', error);
    return NextResponse.json(
      { error: 'Failed to delete co-insurance share' },
      { status: 500 }
    );
  }
}
