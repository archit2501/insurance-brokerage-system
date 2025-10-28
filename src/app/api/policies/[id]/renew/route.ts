import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, clients, insurers, lobs, subLobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nextEntityCode } from '@/app/api/_lib/sequences';
import { authenticateRequest } from '@/app/api/_lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const policyId = parseInt(resolvedParams.id);

    if (isNaN(policyId)) {
      return NextResponse.json(
        { error: 'Invalid policy ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      policyStartDate,
      policyEndDate,
      sumInsured,
      grossPremium,
      adjustmentPercent, // Optional: to increase/decrease premium
    } = body;

    // Fetch original policy
    const originalPolicyResult = await db
      .select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (originalPolicyResult.length === 0) {
      return NextResponse.json(
        { error: 'Original policy not found' },
        { status: 404 }
      );
    }

    const originalPolicy = originalPolicyResult[0];

    // Check if policy already has a renewal
    if (originalPolicy.renewedToPolicyId) {
      return NextResponse.json(
        { 
          error: 'Policy already has a renewal', 
          renewalPolicyId: originalPolicy.renewedToPolicyId 
        },
        { status: 400 }
      );
    }

    // Calculate new premium if adjustment provided
    let newGrossPremium = grossPremium || originalPolicy.grossPremium;
    if (adjustmentPercent) {
      const adjustment = Number(adjustmentPercent);
      newGrossPremium = originalPolicy.grossPremium * (1 + adjustment / 100);
    }

    // Calculate new sum insured if provided, otherwise use original
    const newSumInsured = sumInsured || originalPolicy.sumInsured;

    // Validate dates
    const startDate = new Date(policyStartDate || originalPolicy.policyEndDate);
    const endDate = new Date(policyEndDate);
    
    if (!policyEndDate) {
      return NextResponse.json(
        { error: 'Policy end date is required' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Generate new policy number
    const { code: newPolicyNumber } = await nextEntityCode(db, { 
      entity: 'POLICY'
    });

    // Create renewal policy
    const now = new Date().toISOString();
    const renewalPolicy = await db
      .insert(policies)
      .values({
        policyNumber: newPolicyNumber,
        clientId: originalPolicy.clientId,
        insurerId: originalPolicy.insurerId,
        lobId: originalPolicy.lobId,
        subLobId: originalPolicy.subLobId,
        sumInsured: newSumInsured,
        grossPremium: newGrossPremium,
        currency: originalPolicy.currency,
        policyStartDate: startDate.toISOString().split('T')[0],
        policyEndDate: endDate.toISOString().split('T')[0],
        status: 'active',
        isRenewal: true,
        renewedFromPolicyId: policyId,
        riskDetails: originalPolicy.riskDetails, // Copy risk details
        createdBy: authResult.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update original policy to link to renewal
    await db
      .update(policies)
      .set({
        renewedToPolicyId: renewalPolicy[0].id,
        updatedAt: now,
      })
      .where(eq(policies.id, policyId));

    // Fetch complete renewal policy with relations
    const completeRenewalPolicy = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        clientId: policies.clientId,
        insurerId: policies.insurerId,
        lobId: policies.lobId,
        subLobId: policies.subLobId,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium,
        currency: policies.currency,
        policyStartDate: policies.policyStartDate,
        policyEndDate: policies.policyEndDate,
        status: policies.status,
        isRenewal: policies.isRenewal,
        renewedFromPolicyId: policies.renewedFromPolicyId,
        client: {
          id: clients.id,
          companyName: clients.companyName,
        },
        insurer: {
          id: insurers.id,
          companyName: insurers.companyName,
          shortName: insurers.shortName,
        },
        lob: {
          id: lobs.id,
          name: lobs.name,
        },
      })
      .from(policies)
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .leftJoin(insurers, eq(policies.insurerId, insurers.id))
      .leftJoin(lobs, eq(policies.lobId, lobs.id))
      .where(eq(policies.id, renewalPolicy[0].id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Policy renewed successfully',
      originalPolicyId: policyId,
      renewalPolicy: completeRenewalPolicy[0],
      adjustments: {
        premiumChange: adjustmentPercent || 0,
        oldPremium: originalPolicy.grossPremium,
        newPremium: newGrossPremium,
        oldSumInsured: originalPolicy.sumInsured,
        newSumInsured: newSumInsured,
      },
    });
  } catch (error) {
    console.error('Policy renewal error:', error);
    return NextResponse.json(
      { error: 'Failed to renew policy' },
      { status: 500 }
    );
  }
}
