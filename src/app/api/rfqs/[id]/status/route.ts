import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfqs, rfqInsurers, insurers, policies, lob, subLob } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_STATUSES = ['Draft', 'Quoted', 'Won', 'Lost', 'ConvertedToPolicy'];

const STATUS_TRANSITIONS = {
  Draft: ['Quoted', 'Lost'],
  Quoted: ['Won', 'Lost'],
  Won: ['ConvertedToPolicy'],
  Lost: [],
  ConvertedToPolicy: []
} as const;

export async function POST(request: NextRequest) {
  try {
    const { status, selectedInsurerId, rfqId } = await request.json();

    if (!rfqId || isNaN(parseInt(rfqId))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_RFQ_ID" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    const rfqIdNum = parseInt(rfqId);

    const rfqRecord = await db.select()
      .from(rfqs)
      .where(eq(rfqs.id, rfqIdNum))
      .limit(1);

    if (rfqRecord.length === 0) {
      return NextResponse.json({ 
        error: 'RFQ not found',
        code: 'RFQ_NOT_FOUND'
      }, { status: 404 });
    }

    const currentRfq = rfqRecord[0];

    if (currentRfq.status === status) {
      return NextResponse.json({ 
        error: 'RFQ is already in this status',
        code: 'STATUS_UNCHANGED'
      }, { status: 400 });
    }

    const allowedTransitions = STATUS_TRANSITIONS[currentRfq.status as keyof typeof STATUS_TRANSITIONS];
    if (!allowedTransitions.includes(status as any)) {
      return NextResponse.json({ 
        error: `Invalid status transition from ${currentRfq.status} to ${status}`,
        code: 'INVALID_TRANSITION'
      }, { status: 400 });
    }

    if ((status === 'Won' || status === 'ConvertedToPolicy') && !selectedInsurerId) {
      return NextResponse.json({ 
        error: 'selectedInsurerId is required when status is Won or ConvertedToPolicy',
        code: 'MISSING_SELECTED_INSURER'
      }, { status: 400 });
    }

    if (selectedInsurerId && isNaN(parseInt(selectedInsurerId))) {
      return NextResponse.json({ 
        error: 'selectedInsurerId must be a valid number',
        code: 'INVALID_SELECTED_INSURER'
      }, { status: 400 });
    }

    let selectedInsurerIdNum: number | null = null;
    if (selectedInsurerId) {
      selectedInsurerIdNum = parseInt(selectedInsurerId);
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === 'Won' || status === 'ConvertedToPolicy') {
      const rfqInsurer = await db.select()
        .from(rfqInsurers)
        .where(and(eq(rfqInsurers.rfqId, rfqIdNum), eq(rfqInsurers.insurerId, selectedInsurerIdNum!)))
        .limit(1);

      if (rfqInsurer.length === 0) {
        return NextResponse.json({ 
          error: 'Selected insurer has not quoted on this RFQ',
          code: 'INSURER_NOT_QUOTED'
        }, { status: 400 });
      }

      updateData.selectedInsurerId = selectedInsurerIdNum;

      await db.update(rfqInsurers)
        .set({ isSelected: true })
        .where(eq(rfqInsurers.id, rfqInsurer[0].id));
    }

    const updatedRfq = await db.update(rfqs)
      .set(updateData)
      .where(eq(rfqs.id, rfqIdNum))
      .returning();

    if (updatedRfq.length === 0) {
      return NextResponse.json({ 
        error: 'RFQ update failed',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    if (status === 'ConvertedToPolicy') {
      const policyNumber = generatePolicyNumber();
      
      const newPolicy = await db.insert(policies)
        .values({
          policyNumber,
          clientId: currentRfq.clientId,
          insurerId: selectedInsurerIdNum!,
          rfqId: rfqIdNum,
          lobId: currentRfq.primaryLobId,
          subLobId: currentRfq.subLobId,
          sumInsured: currentRfq.expectedSumInsured || 0,
          grossPremium: currentRfq.expectedGrossPremium || 0,
          currency: currentRfq.currency,
          policyStartDate: new Date().toISOString().split('T')[0],
          policyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdBy: currentRfq.createdBy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      return NextResponse.json({
        rfq: updatedRfq[0],
        policy: newPolicy[0]
      });
    }

    return NextResponse.json(updatedRfq[0]);
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

function generatePolicyNumber(): string {
  const prefix = 'PCY';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random.toString().padStart(3, '0')}`;
}