import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * POST /api/claims/[id]/reject
 * Reject a claim
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
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return NextResponse.json({
        error: 'rejectionReason is required'
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

    if (claim.status === 'Settled' || claim.status === 'Closed') {
      return NextResponse.json({
        error: `Cannot reject claim in ${claim.status} status`
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [updated] = await db.update(claims)
      .set({
        rejectionReason,
        status: 'Rejected',
        updatedAt: now,
      })
      .where(eq(claims.id, claimId))
      .returning();

    return NextResponse.json({
      message: 'Claim rejected successfully',
      claim: updated,
    });
  } catch (error: any) {
    console.error('POST /api/claims/[id]/reject error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to reject claim'
    }, { status: 500 });
  }
}
