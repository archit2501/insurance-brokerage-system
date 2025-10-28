import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateSlipNumber } from '@/lib/sequenceGenerator';

/**
 * POST /api/policies/[id]/generate-slip
 * Generate broking slip number and set validity period
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);
    
    if (isNaN(policyId)) {
      return NextResponse.json(
        { error: 'Invalid policy ID' },
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

    // Check if slip already generated
    if (policyData.slipNumber) {
      return NextResponse.json(
        { 
          error: 'Broking slip already generated for this policy',
          slipNumber: policyData.slipNumber,
          slipStatus: policyData.slipStatus
        },
        { status: 400 }
      );
    }

    // Generate slip number
    const slipNumber = await generateSlipNumber();
    const now = new Date();
    const slipGeneratedAt = now.toISOString();
    
    // Set validity to 30 days from now (standard practice)
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 30);
    const slipValidUntil = validUntil.toISOString();

    // Update policy with slip details
    const updatedPolicy = await db.update(policies)
      .set({
        slipNumber,
        slipStatus: 'draft',
        slipGeneratedAt,
        slipValidUntil,
        updatedAt: now.toISOString()
      })
      .where(eq(policies.id, policyId))
      .returning();

    if (!updatedPolicy || updatedPolicy.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update policy with slip details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Broking slip number generated successfully',
      data: {
        slipNumber,
        slipStatus: 'draft',
        slipGeneratedAt,
        slipValidUntil,
        policyId
      }
    });

  } catch (error) {
    console.error('Error generating slip number:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate broking slip number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
