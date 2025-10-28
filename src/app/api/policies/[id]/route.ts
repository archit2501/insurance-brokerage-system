import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, clients, insurers, lobs, subLobs, rfqs } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// Helper function to get applicable minimum premium from LOB/sub-LOB
async function getApplicableMinPremium(lobId: number, subLobId?: number | null): Promise<number> {
  // Get LOB minimum premium
  const lobResult = await db.select({
    minPremium: lobs.minPremium
  })
  .from(lobs)
  .where(eq(lobs.id, lobId))
  .limit(1);

  if (lobResult.length === 0) {
    throw new Error('LOB not found');
  }

  let minPremium = lobResult[0].minPremium || 0;

  // Check for sub-LOB override if subLobId is provided
  if (subLobId) {
    const subLobResult = await db.select({
      overrideMinPremium: subLobs.overrideMinPremium
    })
    .from(subLobs)
    .where(eq(subLobs.id, subLobId))
    .limit(1);

    if (subLobResult.length > 0 && subLobResult[0].overrideMinPremium !== null) {
      minPremium = subLobResult[0].overrideMinPremium;
    }
  }

  return minPremium;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid policy ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const policyId = parseInt(id);

    const results = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium,
        currency: policies.currency,
        policyStartDate: policies.policyStartDate,
        policyEndDate: policies.policyEndDate,
        confirmationDate: policies.confirmationDate,
        status: policies.status,
        renewedFromPolicyId: policies.renewedFromPolicyId,
        renewedToPolicyId: policies.renewedToPolicyId,
        createdAt: policies.createdAt,
        updatedAt: policies.updatedAt,
        
        client: {
          id: clients.id,
          companyName: clients.companyName,
          cacRcNumber: clients.cacRcNumber,
          tin: clients.tin,
          industry: clients.industry,
          status: clients.status
        },
        
        insurer: {
          id: insurers.id,
          companyName: insurers.companyName,
          shortName: insurers.shortName,
          licenseNumber: insurers.licenseNumber,
          status: insurers.status
        },
        
        lob: {
          id: lobs.id,
          name: lobs.name,
          code: lobs.code
        },
        
        subLob: {
          id: subLobs.id,
          name: subLobs.name,
          code: subLobs.code
        },
        
        rfq: {
          id: rfqs.id,
          expectedSumInsured: rfqs.expectedSumInsured,
          expectedGrossPremium: rfqs.expectedGrossPremium,
          currency: rfqs.currency,
          targetRatePct: rfqs.targetRatePct,
          status: rfqs.status,
          selectedInsurerId: rfqs.selectedInsurerId
        }
      })
      .from(policies)
      .innerJoin(clients, eq(policies.clientId, clients.id))
      .innerJoin(insurers, eq(policies.insurerId, insurers.id))
      .innerJoin(lobs, eq(policies.lobId, lobs.id))
      .leftJoin(subLobs, eq(policies.subLobId, subLobs.id))
      .leftJoin(rfqs, eq(policies.rfqId, rfqs.id))
      .where(eq(policies.id, policyId))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      }, { status: 404 });
    }

    const policy = results[0];
    // Calculate rate if sumInsured is available
    const rate = policy.sumInsured && policy.sumInsured > 0
      ? (policy.grossPremium / policy.sumInsured) * 100
      : null;

    return NextResponse.json({
      ...policy,
      rate
    });
  } catch (error) {
    console.error('GET policy error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid policy ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const policyId = parseInt(id);
    const body = await request.json();

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ 
        error: 'Request body cannot be empty',
        code: 'EMPTY_BODY'
      }, { status: 400 });
    }

    const allowedFields = ['sumInsured', 'grossPremium', 'policyStartDate', 'policyEndDate', 'confirmationDate', 'status'];
    const forbiddenFields = ['policyNumber', 'clientId', 'insurerId', 'rfqId', 'lobId', 'subLobId', 'createdBy', 'createdAt', 'id'];
    
    const providedForbiddenFields = Object.keys(body).filter(key => forbiddenFields.includes(key));
    if (providedForbiddenFields.length > 0) {
      return NextResponse.json({ 
        error: `Cannot update these fields: ${providedForbiddenFields.join(', ')}`,
        code: 'FORBIDDEN_FIELDS'
      }, { status: 400 });
    }

    const invalidFields = Object.keys(body).filter(key => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      return NextResponse.json({ 
        error: `Invalid fields provided: ${invalidFields.join(', ')}`,
        code: 'INVALID_FIELDS'
      }, { status: 400 });
    }

    // Get current policy for validation
    const currentPolicy = await db.select()
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (currentPolicy.length === 0) {
      return NextResponse.json({ 
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      }, { status: 404 });
    }

    const policy = currentPolicy[0];
    const updates: any = {};
    
    if ('sumInsured' in body) {
      const sumInsured = parseFloat(body.sumInsured);
      if (isNaN(sumInsured) || sumInsured <= 0) {
        return NextResponse.json({ 
          error: 'Sum insured must be a positive number',
          code: 'INVALID_SUM_INSURED'
        }, { status: 400 });
      }
      updates.sumInsured = sumInsured;
    }

    if ('grossPremium' in body) {
      const grossPremium = parseFloat(body.grossPremium);
      if (isNaN(grossPremium) || grossPremium < 0) {
        return NextResponse.json({ 
          error: 'Gross premium must be a non-negative number',
          code: 'INVALID_GROSS_PREMIUM'
        }, { status: 400 });
      }

      // Enforce minimum premium rule for gross premium updates
      try {
        const minPremium = await getApplicableMinPremium(policy.lobId, policy.subLobId ?? undefined);
        if (grossPremium < minPremium) {
          return NextResponse.json({
            error: 'Gross premium below minimum for selected LOB/Sub-LOB',
            code: 'BELOW_MIN_PREMIUM',
            minPremium: minPremium,
            providedPremium: grossPremium
          }, { status: 422 });
        }
      } catch (error) {
        return NextResponse.json({
          error: 'Unable to validate minimum premium',
          code: 'MIN_PREMIUM_CHECK_FAILED'
        }, { status: 500 });
      }

      updates.grossPremium = grossPremium;
    }

    if ('policyStartDate' in body) {
      const startDate = new Date(body.policyStartDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid policy start date format',
          code: 'INVALID_START_DATE'
        }, { status: 400 });
      }
      updates.policyStartDate = startDate.toISOString();
    }

    if ('policyEndDate' in body) {
      const endDate = new Date(body.policyEndDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid policy end date format',
          code: 'INVALID_END_DATE'
        }, { status: 400 });
      }
      updates.policyEndDate = endDate.toISOString();
    }

    if ('confirmationDate' in body && body.confirmationDate !== null) {
      const confirmDate = new Date(body.confirmationDate);
      if (isNaN(confirmDate.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid confirmation date format',
          code: 'INVALID_CONFIRM_DATE'
        }, { status: 400 });
      }
      updates.confirmationDate = confirmDate.toISOString();
    } else if ('confirmationDate' in body && body.confirmationDate === null) {
      updates.confirmationDate = null;
    }

    if ('status' in body) {
      const validStatuses = ['active', 'inactive', 'expired', 'cancelled', 'suspended'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ 
          error: 'Status must be one of: active, inactive, expired, cancelled, suspended',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = body.status;
    }

    if ('policyStartDate' in updates && 'policyEndDate' in updates) {
      const startDate = new Date(updates.policyStartDate);
      const endDate = new Date(updates.policyEndDate);
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'Policy start date must be before end date',
          code: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }
    } else if ('policyStartDate' in updates) {
      const startDate = new Date(updates.policyStartDate);
      const endDate = new Date(policy.policyEndDate);
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'Policy start date must be before end date',
          code: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }
    } else if ('policyEndDate' in updates) {
      const startDate = new Date(policy.policyStartDate);
      const endDate = new Date(updates.policyEndDate);
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'Policy start date must be before end date',
          code: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }
    }

    updates.updatedAt = new Date().toISOString();

    const result = await db
      .update(policies)
      .set(updates)
      .where(eq(policies.id, policyId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ 
        error: 'Policy not found',
        code: 'POLICY_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('PUT policy error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}