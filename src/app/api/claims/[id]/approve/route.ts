import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * POST /api/claims/[id]/approve
 * Approve a claim (move to Approved status)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const claimId = parseInt(id);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    const body = await req.json();
    const { approvedAmount } = body;

    if (!approvedAmount || parseFloat(approvedAmount) <= 0) {
      return NextResponse.json({
        error: 'Valid approvedAmount is required'
      }, { status: 400 });
    }

    // Check if claim exists
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'UnderInvestigation') {
      return NextResponse.json({
        error: `Claim must be Under Investigation to approve. Current status: ${claim.status}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [updated] = await db.update(claims)
      .set({
        approvedAmount: parseFloat(approvedAmount),
        status: 'Approved',
        approvedBy: parseInt(session.user.id),
        updatedAt: now,
      })
      .where(eq(claims.id, claimId))
      .returning();

    return NextResponse.json({
      message: 'Claim approved successfully',
      claim: updated,
    });
  } catch (error: any) {
    console.error('POST /api/claims/[id]/approve error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to approve claim'
    }, { status: 500 });
  }
}
