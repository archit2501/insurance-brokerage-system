import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { endorsements, policies, lobs, subLobs, users } from '@/db/schema';
import { eq, and, like, or, desc, asc, sql } from 'drizzle-orm';

function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const role = request.headers.get('x-role') || 'Viewer';
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1, role };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user info from headers (simplified for testing)
    const userId = parseInt(request.headers.get('x-user-id') || '1');

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Get endorsement with related data using separate queries to avoid alias conflicts
    const endorsement = await db
      .select()
      .from(endorsements)
      .where(eq(endorsements.id, parseInt(id)))
      .limit(1);

    if (endorsement.length === 0) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    }

    const endorsementData = endorsement[0];

    // Get policy details
    const policyData = await db
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
      })
      .from(policies)
      .where(eq(policies.id, endorsementData.policyId))
      .limit(1);

    // Get LOB details
    let lobData = null;
    let subLobData = null;
    if (policyData.length > 0) {
      const lobResult = await db.select()
        .from(lobs)
        .where(eq(lobs.id, policyData[0].lobId))
        .limit(1);
      
      lobData = lobResult.length > 0 ? lobResult[0] : null;

      if (policyData[0].subLobId) {
        const subLobResult = await db.select()
          .from(subLobs)
          .where(eq(subLobs.id, policyData[0].subLobId))
          .limit(1);
        
        subLobData = subLobResult.length > 0 ? subLobResult[0] : null;
      }
    }

    // Get prepared by user details
    let preparedByUser = null;
    if (endorsementData.preparedBy) {
      const preparedResult = await db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, endorsementData.preparedBy))
      .limit(1);
      
      preparedByUser = preparedResult.length > 0 ? preparedResult[0] : null;
    }

    // Get authorized by user details
    let authorizedByUser = null;
    if (endorsementData.authorizedBy) {
      const authorizedResult = await db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, endorsementData.authorizedBy))
      .limit(1);
      
      authorizedByUser = authorizedResult.length > 0 ? authorizedResult[0] : null;
    }

    return NextResponse.json({
      ...endorsementData,
      policy: policyData.length > 0 ? policyData[0] : null,
      lob: lobData,
      subLob: subLobData,
      preparedByUser,
      authorizedByUser,
    });
  } catch (error) {
    console.error('GET endorsement error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user info from headers (simplified for testing)
    const userRole = request.headers.get('x-role') || 'Viewer';
    const userId = parseInt(request.headers.get('x-user-id') || '1');

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();

    // Security: Reject user identifier fields
    if ('userId' in body || 'user_id' in body || 'preparedBy' in body || 'authorizedBy' in body) {
      return NextResponse.json({ 
        error: "User identifier fields cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Reject immutable fields
    const immutableFields = ['policyId', 'endorsementNumber', 'status', 'createdAt', 'updatedAt'];
    for (const field of immutableFields) {
      if (field in body) {
        return NextResponse.json({ 
          error: `Field '${field}' cannot be updated`,
          code: 'IMMUTABLE_FIELD' 
        }, { status: 400 });
      }
    }

    // Validate allowed fields
    const allowedFields = ['type', 'effectiveDate', 'description', 'sumInsuredDelta', 'grossPremiumDelta', 'brokeragePct', 'vatPct', 'levies'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Validate required fields
    if (!updates.effectiveDate) {
      return NextResponse.json({ 
        error: 'Effective date is required',
        code: 'MISSING_REQUIRED_FIELD'
      }, { status: 400 });
    }

    // Validate date format
    if (updates.effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(updates.effectiveDate)) {
      return NextResponse.json({ 
        error: 'Effective date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }

    // Validate percentages
    if (updates.brokeragePct !== undefined) {
      const brokeragePct = parseFloat(updates.brokeragePct);
      if (isNaN(brokeragePct) || brokeragePct < 0 || brokeragePct > 100) {
        return NextResponse.json({ 
          error: 'Brokerage percentage must be between 0 and 100',
          code: 'INVALID_PERCENTAGE'
        }, { status: 400 });
      }
      updates.brokeragePct = brokeragePct;
    }

    if (updates.vatPct !== undefined) {
      const vatPct = parseFloat(updates.vatPct);
      if (isNaN(vatPct) || vatPct < 0 || vatPct > 100) {
        return NextResponse.json({ 
          error: 'VAT percentage must be between 0 and 100',
          code: 'INVALID_PERCENTAGE'
        }, { status: 400 });
      }
      updates.vatPct = vatPct;
    }

    // Validate numeric fields
    if (updates.sumInsuredDelta !== undefined) {
      const sumInsuredDelta = parseFloat(updates.sumInsuredDelta);
      if (isNaN(sumInsuredDelta)) {
        return NextResponse.json({ 
          error: 'Sum insured delta must be a valid number',
          code: 'INVALID_NUMBER'
        }, { status: 400 });
      }
      updates.sumInsuredDelta = sumInsuredDelta;
    }

    if (updates.grossPremiumDelta !== undefined) {
      const grossPremiumDelta = parseFloat(updates.grossPremiumDelta);
      if (isNaN(grossPremiumDelta)) {
        return NextResponse.json({ 
          error: 'Gross premium delta must be a valid number',
          code: 'INVALID_NUMBER'
        }, { status: 400 });
      }
      updates.grossPremiumDelta = grossPremiumDelta;
    }

    // Validate levies JSON
    if (updates.levies !== undefined) {
      try {
        if (typeof updates.levies === 'string') {
          updates.levies = JSON.parse(updates.levies);
        }
        if (typeof updates.levies !== 'object' || updates.levies === null) {
          throw new Error('Invalid levies format');
        }
      } catch (error) {
        return NextResponse.json({ 
          error: 'Levies must be valid JSON object',
          code: 'INVALID_JSON'
        }, { status: 400 });
      }
    }

    // Get current endorsement
    const currentEndorsement = await db
      .select()
      .from(endorsements)
      .where(eq(endorsements.id, parseInt(id)))
      .limit(1);

    if (currentEndorsement.length === 0) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    }

    const endorsement = currentEndorsement[0];

    // Check if user is creator or admin
    const isCreator = endorsement.preparedBy === userId;
    const isAdmin = userRole === 'Admin';
    
    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only creator or Admin can modify endorsements',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    // Check status is Draft
    if (endorsement.status !== 'Draft') {
      return NextResponse.json({ 
        error: 'Only Draft endorsements can be modified',
        code: 'INVALID_STATUS'
      }, { status: 403 });
    }

    // Recalculate net amount due if financial fields changed
    if (updates.grossPremiumDelta !== undefined || updates.brokeragePct !== undefined || updates.vatPct !== undefined || updates.levies !== undefined) {
      const grossPremiumDelta = updates.grossPremiumDelta !== undefined ? updates.grossPremiumDelta : endorsement.grossPremiumDelta || 0;
      const brokeragePct = updates.brokeragePct !== undefined ? updates.brokeragePct : endorsement.brokeragePct || 0;
      const vatPct = updates.vatPct !== undefined ? updates.vatPct : endorsement.vatPct || 7.5;
      const levies = updates.levies !== undefined ? updates.levies : endorsement.levies || {};

      const brokerageAmount = grossPremiumDelta * (brokeragePct / 100);
      const vatAmount = brokerageAmount * (vatPct / 100);
      const leviesTotal = Object.values(levies).reduce((sum: number, value: any) => sum + (parseFloat(value) || 0), 0);
      const netAmountDue = grossPremiumDelta - brokerageAmount - vatAmount - leviesTotal;

      updates.netAmountDue = netAmountDue;
    }

    updates.updatedAt = new Date().toISOString();

    const updatedEndorsement = await db
      .update(endorsements)
      .set(updates)
      .where(eq(endorsements.id, parseInt(id)))
      .returning();

    if (updatedEndorsement.length === 0) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEndorsement[0]);
  } catch (error) {
    console.error('PUT endorsement error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user info from headers (simplified for testing)
    const userRole = request.headers.get('x-role') || 'Viewer';
    const userId = parseInt(request.headers.get('x-user-id') || '1');

    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Get current endorsement
    const currentEndorsement = await db
      .select()
      .from(endorsements)
      .where(eq(endorsements.id, parseInt(id)))
      .limit(1);

    if (currentEndorsement.length === 0) {
      return NextResponse.json({ error: 'Endorsement not found' }, { status: 404 });
    }

    const endorsement = currentEndorsement[0];

    // Check if user is creator or admin
    const isCreator = endorsement.preparedBy === userId;
    const isAdmin = userRole === 'Admin';
    
    if (!isCreator && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only creator or Admin can delete endorsements',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    // Check status is Draft
    if (endorsement.status !== 'Draft') {
      return NextResponse.json({ 
        error: 'Only Draft endorsements can be deleted',
        code: 'INVALID_STATUS'
      }, { status: 403 });
    }

    const deletedEndorsement = await db
      .delete(endorsements)
      .where(eq(endorsements.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Endorsement deleted successfully',
      endorsement: deletedEndorsement[0]
    });
  } catch (error) {
    console.error('DELETE endorsement error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}