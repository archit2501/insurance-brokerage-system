import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { endorsements, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    // Get user info from headers (simplified for testing)
    const userRole = request.headers.get('x-role') || 'Viewer';
    const userId = parseInt(request.headers.get('x-user-id') || '1');
    const approvalLevel = request.headers.get('x-approval-level') || 'L1';

    // Check approval level (L2 or higher required)
    const levelNumber = parseInt(approvalLevel.replace('L', ''));
    if (levelNumber < 2) {
      return NextResponse.json({ 
        error: 'Insufficient approval level. L2 or higher required',
        code: 'INSUFFICIENT_APPROVAL_LEVEL' 
      }, { status: 403 });
    }

    const id = id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid endorsement ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }
    
    const endorsementId = parseInt(id);

    // Check if endorsement exists and is in Draft status
    const endorsement = await db.select()
      .from(endorsements)
      .where(eq(endorsements.id, endorsementId))
      .limit(1);

    if (endorsement.length === 0) {
      return NextResponse.json({ 
        error: 'Endorsement not found',
        code: 'ENDORSEMENT_NOT_FOUND' 
      }, { status: 404 });
    }

    if (endorsement[0].status !== 'Draft') {
      return NextResponse.json({ 
        error: 'Only endorsements with Draft status can be approved',
        code: 'INVALID_STATUS' 
      }, { status: 403 });
    }

    // Update the endorsement
    const updatedEndorsement = await db.update(endorsements)
      .set({
        status: 'Approved',
        authorizedBy: userId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(endorsements.id, endorsementId))
      .returning();

    // Get user details for authorizedBy
    const authorizedUser = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      approvalLevel: users.approvalLevel
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Endorsement approved successfully',
      endorsement: {
        ...updatedEndorsement[0],
        authorizedBy: authorizedUser[0] || null
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Approve endorsement error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}