import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { endorsements, policies, lobs, subLobs, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Get user info from headers (simplified for testing)
    const userRole = request.headers.get('x-role') || 'Viewer';
    const userId = parseInt(request.headers.get('x-user-id') || '1');
    const approvalLevel = request.headers.get('x-approval-level') || 'L1';

    // Check approval level (L3 or higher required)
    const levelNumber = parseInt(approvalLevel.replace('L', ''));
    if (levelNumber < 3) {
      return NextResponse.json(
        { error: 'Insufficient approval level. L3 or higher required.', code: 'INSUFFICIENT_APPROVAL' },
        { status: 403 }
      );
    }
    
    // Validate ID format
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid endorsement ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const endorsementId = parseInt(id);

    // Find the endorsement with policy details
    const endorsementWithPolicy = await db
      .select({
        endorsement: endorsements,
        policy: {
          id: policies.id,
          grossPremium: policies.grossPremium,
          lobId: policies.lobId,
          subLobId: policies.subLobId,
        }
      })
      .from(endorsements)
      .innerJoin(policies, eq(endorsements.policyId, policies.id))
      .where(eq(endorsements.id, endorsementId))
      .limit(1);

    if (endorsementWithPolicy.length === 0) {
      return NextResponse.json(
        { error: 'Endorsement not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { endorsement, policy } = endorsementWithPolicy[0];

    // Check if endorsement is approved
    if (endorsement.status !== 'Approved') {
      return NextResponse.json(
        { 
          error: 'Endorsement must be in Approved status to issue', 
          code: 'INVALID_STATUS',
          currentStatus: endorsement.status
        },
        { status: 403 }
      );
    }

    // Calculate resulting policy premium
    const resultingPremium = (policy.grossPremium || 0) + (endorsement.grossPremiumDelta || 0);

    // Get applicable minimum premium
    let minPremium = 0;
    
    if (policy.subLobId) {
      // Check sub-LOB override first
      const subLobData = await db.select({
        overrideMinPremium: subLobs.overrideMinPremium,
        lobMinPremium: lobs.minPremium
      })
        .from(subLobs)
        .innerJoin(lobs, eq(subLobs.lobId, lobs.id))
        .where(eq(subLobs.id, policy.subLobId))
        .limit(1);
      
      if (subLobData.length > 0) {
        minPremium = subLobData[0].overrideMinPremium || subLobData[0].lobMinPremium || 0;
      }
    } else {
      // Get LOB minimum
      const lobData = await db.select({
        minPremium: lobs.minPremium
      })
        .from(lobs)
        .where(eq(lobs.id, policy.lobId))
        .limit(1);
      
      if (lobData.length > 0) {
        minPremium = lobData[0].minPremium || 0;
      }
    }

    // Validate minimum premium requirement
    if (resultingPremium < minPremium) {
      const shortfall = minPremium - resultingPremium;
      
      // Get user override capabilities
      const userData = await db.select({
        role: users.role,
        maxOverrideLimit: users.maxOverrideLimit
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const user = userData.length > 0 ? userData[0] : null;
      
      // Check override permissions
      const canOverride = user && 
        user.role === 'Admin' && 
        (user.maxOverrideLimit || 0) >= shortfall;

      if (!canOverride) {
        return NextResponse.json({
          error: 'Resulting policy premium below minimum for LOB/Sub-LOB',
          code: 'BELOW_MIN_PREMIUM',
          details: {
            resultingPremium,
            minPremium,
            shortfall,
            canOverride: false,
            userMaxOverride: user?.maxOverrideLimit || 0
          }
        }, { status: 422 });
      }
    }

    // Generate placeholder values for PDF and hash
    const timestamp = Date.now();
    const pdfPath = `/pdf/endorsements/${endorsement.endorsementNumber}.pdf`;
    const sha256Hash = `issued_${timestamp}_${endorsementId}`;

    // Update endorsement status to Issued
    const updated = await db
      .update(endorsements)
      .set({
        status: 'Issued',
        updatedAt: new Date().toISOString()
      })
      .where(eq(endorsements.id, endorsementId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update endorsement', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    const updatedEndorsement = updated[0];

    // Get authorizedBy user details
    const authorizedByUser = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        approvalLevel: users.approvalLevel
      })
      .from(users)
      .where(eq(users.id, updatedEndorsement.authorizedBy!))
      .limit(1);

    // Return success response with updated endorsement
    return NextResponse.json({
      message: 'Endorsement issued successfully',
      endorsement: {
        ...updatedEndorsement,
        pdfPath,
        sha256Hash,
        authorizedBy: authorizedByUser.length > 0 ? authorizedByUser[0] : null
      }
    });

  } catch (error) {
    console.error('Issue endorsement error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}