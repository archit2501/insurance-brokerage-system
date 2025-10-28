import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * POST /api/claims/[id]/assign-adjuster
 * Assign a loss adjuster to investigate the claim
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
    const { adjusterAssignedId } = body;

    if (!adjusterAssignedId) {
      return NextResponse.json({ error: 'adjusterAssignedId is required' }, { status: 400 });
    }

    // Verify adjuster exists and has Claims role
    const [adjuster] = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(adjusterAssignedId)))
      .limit(1);

    if (!adjuster) {
      return NextResponse.json({ error: 'Adjuster not found' }, { status: 404 });
    }

    if (adjuster.role !== 'Claims' && adjuster.role !== 'Admin') {
      return NextResponse.json({
        error: 'Selected user must have Claims or Admin role'
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

    const now = new Date().toISOString();
    const [updated] = await db.update(claims)
      .set({
        adjusterAssignedId: parseInt(adjusterAssignedId),
        assignedDate: now,
        status: 'UnderInvestigation',
        updatedAt: now,
      })
      .where(eq(claims.id, claimId))
      .returning();

    return NextResponse.json({
      message: 'Adjuster assigned successfully',
      claim: updated,
    });
  } catch (error: any) {
    console.error('POST /api/claims/[id]/assign-adjuster error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to assign adjuster'
    }, { status: 500 });
  }
}
