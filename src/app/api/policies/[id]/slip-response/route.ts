import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/policies/[id]/slip-response
 * Record insurer's response to broking slip (bound/declined)
 * 
 * Request body:
 * {
 *   response: 'bound' | 'declined',
 *   responseNotes?: string,
 *   confirmedGrossPremium?: number,  // If insurer modifies premium
 *   confirmedSumInsured?: number,    // If insurer modifies sum insured
 *   conditions?: string              // Any special conditions from insurer
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

    const body = await request.json();
    const { 
      response, 
      responseNotes, 
      confirmedGrossPremium, 
      confirmedSumInsured,
      conditions 
    } = body;

    // Validate response
    if (!response || !['bound', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response. Must be either "bound" or "declined"' },
        { status: 400 }
      );
    }

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

    // Check if slip exists
    if (!policyData.slipNumber) {
      return NextResponse.json(
        { error: 'No broking slip found for this policy' },
        { status: 400 }
      );
    }

    // Check if slip was submitted
    if (policyData.slipStatus !== 'submitted') {
      return NextResponse.json(
        { 
          error: `Cannot record response - slip status is '${policyData.slipStatus}'. Slip must be submitted first.`,
          currentStatus: policyData.slipStatus
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: any = {
      slipStatus: response,
      insurerResponseAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // If bound, update policy status and potentially update premium/sum insured
    if (response === 'bound') {
      updateData.status = 'active';  // Activate the policy
      
      // Update premium if insurer confirmed a different amount
      if (confirmedGrossPremium !== undefined && confirmedGrossPremium !== null) {
        updateData.grossPremium = confirmedGrossPremium;
      }
      
      // Update sum insured if insurer confirmed a different amount
      if (confirmedSumInsured !== undefined && confirmedSumInsured !== null) {
        updateData.sumInsured = confirmedSumInsured;
      }

      // Set confirmation date
      updateData.confirmationDate = now.toISOString();
    }

    // Update policy with insurer's response
    const updatedPolicy = await db.update(policies)
      .set(updateData)
      .where(eq(policies.id, policyId))
      .returning();

    if (!updatedPolicy || updatedPolicy.length === 0) {
      return NextResponse.json(
        { error: 'Failed to record insurer response' },
        { status: 500 }
      );
    }

    // Prepare response message
    const message = response === 'bound'
      ? 'Broking slip accepted by insurer. Policy is now active.'
      : 'Broking slip declined by insurer. Please generate a new slip if needed.';

    return NextResponse.json({
      success: true,
      message,
      data: {
        policyId,
        slipNumber: policyData.slipNumber,
        slipStatus: response,
        policyStatus: response === 'bound' ? 'active' : policyData.status,
        responseRecordedAt: updateData.insurerResponseAt,
        confirmedGrossPremium: updateData.grossPremium || policyData.grossPremium,
        confirmedSumInsured: updateData.sumInsured || policyData.sumInsured,
        responseNotes,
        conditions
      }
    });

  } catch (error) {
    console.error('Error recording insurer response:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record insurer response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/policies/[id]/slip-response
 * Get slip response details for a policy
 */
export async function GET(
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

    const policy = await db.select({
      id: policies.id,
      slipNumber: policies.slipNumber,
      slipStatus: policies.slipStatus,
      slipGeneratedAt: policies.slipGeneratedAt,
      slipValidUntil: policies.slipValidUntil,
      submittedToInsurerAt: policies.submittedToInsurerAt,
      insurerResponseAt: policies.insurerResponseAt,
      status: policies.status,
      grossPremium: policies.grossPremium,
      sumInsured: policies.sumInsured,
    })
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (!policy || policy.length === 0) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: policy[0]
    });

  } catch (error) {
    console.error('Error fetching slip response:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch slip response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
