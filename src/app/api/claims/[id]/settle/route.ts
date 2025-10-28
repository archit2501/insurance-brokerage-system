import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * POST /api/claims/[id]/settle
 * Settle a claim (move to Settled status)
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

    const claimId = parseInt((await params).id);
    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    const body = await req.json();
    const { settlementAmount } = body;

    if (!settlementAmount || parseFloat(settlementAmount) <= 0) {
      return NextResponse.json({
        error: 'Valid settlementAmount is required'
      }, { status: 400 });
    }

    // Check if claim exists and is approved
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, claimId))
      .limit(1);

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'Approved') {
      return NextResponse.json({
        error: `Claim must be in Approved status to settle. Current status: ${claim.status}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [updated] = await db.update(claims)
      .set({
        settlementAmount: parseFloat(settlementAmount),
        settlementDate: now,
        status: 'Settled',
        updatedAt: now,
      })
      .where(eq(claims.id, claimId))
      .returning();

    return NextResponse.json({
      message: 'Claim settled successfully',
      claim: updated,
    });
  } catch (error: any) {
    console.error('POST /api/claims/[id]/settle error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to settle claim'
    }, { status: 500 });
  }
}
