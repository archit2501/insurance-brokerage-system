import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, insurers } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/policies/[id]/submit-slip
 * Submit broking slip to insurer (updates status to 'submitted')
 * 
 * Request body (optional):
 * {
 *   insurerId?: number,  // If changing insurer at submission
 *   notes?: string       // Any submission notes
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const policyId = parseInt((await params).id);
    
    if (isNaN(policyId)) {
      return NextResponse.json(
        { error: 'Invalid policy ID' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { insurerId, notes } = body;

    // Check if policy exists
    const policy = await db.select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (!policy || policy.length === 0) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const policyData = policy[0];

    // Check if slip number exists
    if (!policyData.slipNumber) {
      return NextResponse.json(
        { error: 'Broking slip not yet generated. Please generate slip number first.' },
        { status: 400 }
      );
    }

    // Check slip status
    if (policyData.slipStatus === 'submitted') {
      return NextResponse.json(
        { 
          error: 'Broking slip already submitted',
          submittedAt: policyData.submittedToInsurerAt
        },
        { status: 400 }
      );
    }

    if (policyData.slipStatus === 'bound') {
      return NextResponse.json(
        { error: 'Cannot submit - slip already bound by insurer' },
        { status: 400 }
      );
    }

    if (policyData.slipStatus === 'declined') {
      return NextResponse.json(
        { error: 'Cannot submit - slip was declined. Please generate a new slip.' },
        { status: 400 }
      );
    }

    // Check if slip is expired
    if (policyData.slipValidUntil) {
      const validUntil = new Date(policyData.slipValidUntil);
      if (validUntil < new Date()) {
        return NextResponse.json(
          { error: 'Broking slip has expired. Please generate a new slip.' },
          { status: 400 }
        );
      }
    }

    // If insurerId provided, verify it exists
    if (insurerId) {
      const insurerResult = await db.select()
        .from(insurers)
        .where(eq(insurers.id, insurerId))
        .limit(1);

      if (!insurerResult || insurerResult.length === 0) {
        return NextResponse.json(
          { error: 'Insurer not found' },
          { status: 404 }
        );
      }
    }

    const now = new Date();
    const updateData: any = {
      slipStatus: 'submitted',
      submittedToInsurerAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Update insurer if provided
    if (insurerId) {
      updateData.insurerId = insurerId;
    }

    // Update policy
    const updatedPolicy = await db.update(policies)
      .set(updateData)
      .where(eq(policies.id, policyId))
      .returning();

    if (!updatedPolicy || updatedPolicy.length === 0) {
      return NextResponse.json(
        { error: 'Failed to submit broking slip' },
        { status: 500 }
      );
    }

    // TODO: Integrate with email dispatch system to send slip to insurer
    // This can be done by calling the dispatch API endpoint or email service

    return NextResponse.json({
      success: true,
      message: 'Broking slip submitted to insurer successfully',
      data: {
        policyId,
        slipNumber: policyData.slipNumber,
        slipStatus: 'submitted',
        submittedAt: updateData.submittedToInsurerAt,
        insurerId: updateData.insurerId || policyData.insurerId,
        notes
      }
    });

  } catch (error) {
    console.error('Error submitting broking slip:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit broking slip',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
