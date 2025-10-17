import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfqs, clients, lobs, subLobs, insurers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Get RFQ with joined details
    const rfqResults = await db.select({
      rfq: rfqs,
      client: clients,
      lob: lobs,
      subLob: subLobs,
      selectedInsurer: insurers
    })
    .from(rfqs)
    .leftJoin(clients, eq(rfqs.clientId, clients.id))
    .leftJoin(lobs, eq(rfqs.primaryLobId, lobs.id))
    .leftJoin(subLobs, eq(rfqs.subLobId, subLobs.id))
    .leftJoin(insurers, eq(rfqs.selectedInsurerId, insurers.id))
    .where(eq(rfqs.id, parseInt(id)))
    .limit(1);

    if (rfqResults.length === 0) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    return NextResponse.json(rfqResults[0]);
  } catch (error) {
    console.error('GET RFQ error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const {
      description,
      expectedSumInsured,
      expectedGrossPremium,
      currency,
      targetRatePct,
      subLobId
    } = body;

    // Validate no restricted fields are being updated
    const restrictedFields = ['clientId', 'primaryLobId', 'status', 'selectedInsurerId', 'createdBy', 'createdAt'];
    const providedRestrictedFields = restrictedFields.filter(field => field in body);
    if (providedRestrictedFields.length > 0) {
      return NextResponse.json({ 
        error: `Cannot update restricted fields: ${providedRestrictedFields.join(', ')}`,
        code: "RESTRICTED_FIELDS" 
      }, { status: 400 });
    }

    // Validate foreign keys if provided
    if (subLobId !== undefined) {
      const subLobExists = await db.select()
        .from(subLobs)
        .where(eq(subLobs.id, subLobId))
        .limit(1);
      
      if (subLobExists.length === 0) {
        return NextResponse.json({ 
          error: "Sub LOB not found",
          code: "INVALID_SUB_LOB" 
        }, { status: 400 });
      }
    }

    // Build update object with only allowed fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (description !== undefined) updateData.description = description.trim();
    if (expectedSumInsured !== undefined) updateData.expectedSumInsured = expectedSumInsured;
    if (expectedGrossPremium !== undefined) updateData.expectedGrossPremium = expectedGrossPremium;
    if (currency !== undefined) updateData.currency = currency.trim().toUpperCase();
    if (targetRatePct !== undefined) updateData.targetRatePct = targetRatePct;
    if (subLobId !== undefined) updateData.subLobId = subLobId;

    const updated = await db.update(rfqs)
      .set(updateData)
      .where(eq(rfqs.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT RFQ error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check RFQ exists and status
    const existingRfq = await db.select()
      .from(rfqs)
      .where(eq(rfqs.id, parseInt(id)))
      .limit(1);

    if (existingRfq.length === 0) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    if (existingRfq[0].status !== 'Draft') {
      return NextResponse.json({ 
        error: "Can only delete RFQ with status 'Draft'",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Soft delete by updating status
    const deleted = await db.update(rfqs)
      .set({ 
        status: 'Deleted',
        updatedAt: new Date().toISOString()
      })
      .where(eq(rfqs.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'RFQ deleted successfully',
      rfq: deleted[0]
    });
  } catch (error) {
    console.error('DELETE RFQ error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}