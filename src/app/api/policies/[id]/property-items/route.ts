import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policyPropertyItems, policies } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    const items = await db
      .select()
      .from(policyPropertyItems)
      .where(eq(policyPropertyItems.policyId, policyId))
      .orderBy(policyPropertyItems.slNo);

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching property items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    // Verify policy exists
    const policy = await db.select().from(policies).where(eq(policies.id, policyId)).limit(1);
    if (!policy.length) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const newItem = await db.insert(policyPropertyItems).values({
      policyId,
      slNo: body.slNo,
      itemType: body.itemType,
      description: body.description,
      details: body.details || null,
      value: body.value || null,
      noOfUnits: body.noOfUnits || null,
      sumInsured: body.sumInsured || null,
      maxLiability: body.maxLiability || null,
      aoaAmount: body.aoaAmount || null,
      aoyAmount: body.aoyAmount || null,
      grossProfit: body.grossProfit || null,
      netProfit: body.netProfit || null,
      standingCharges: body.standingCharges || null,
      auditorFees: body.auditorFees || null,
      increasedCostOfWorking: body.increasedCostOfWorking || null,
      indemnityPeriodMonths: body.indemnityPeriodMonths || null,
      rate: body.rate,
      premium: body.premium,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(newItem[0], { status: 201 });
  } catch (error) {
    console.error('Error creating property item:', error);
    return NextResponse.json(
      { error: 'Failed to create property item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);

    if (isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid policy ID' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const updated = await db
      .update(policyPropertyItems)
      .set({
        slNo: body.slNo,
        itemType: body.itemType,
        description: body.description,
        details: body.details || null,
        value: body.value || null,
        noOfUnits: body.noOfUnits || null,
        sumInsured: body.sumInsured || null,
        maxLiability: body.maxLiability || null,
        aoaAmount: body.aoaAmount || null,
        aoyAmount: body.aoyAmount || null,
        grossProfit: body.grossProfit || null,
        netProfit: body.netProfit || null,
        standingCharges: body.standingCharges || null,
        auditorFees: body.auditorFees || null,
        increasedCostOfWorking: body.increasedCostOfWorking || null,
        indemnityPeriodMonths: body.indemnityPeriodMonths || null,
        rate: body.rate,
        premium: body.premium,
        updatedAt: now,
      })
      .where(
        and(
          eq(policyPropertyItems.id, body.itemId),
          eq(policyPropertyItems.policyId, policyId)
        )
      )
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating property item:', error);
    return NextResponse.json(
      { error: 'Failed to update property item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const policyId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (isNaN(policyId) || !itemId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await db
      .delete(policyPropertyItems)
      .where(
        and(
          eq(policyPropertyItems.id, parseInt(itemId)),
          eq(policyPropertyItems.policyId, policyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting property item:', error);
    return NextResponse.json(
      { error: 'Failed to delete property item' },
      { status: 500 }
    );
  }
}
