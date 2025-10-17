import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfqInsurers, rfqs, insurers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rfqId = searchParams.get('rfqId');
    
    if (!rfqId) {
      return NextResponse.json({ 
        error: "RFQ ID is required",
        code: "MISSING_RFQ_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(rfqId))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_RFQ_ID" 
      }, { status: 400 });
    }

    // Check if RFQ exists
    const rfqExists = await db.select()
      .from(rfqs)
      .where(eq(rfqs.id, parseInt(rfqId)))
      .limit(1);

    if (rfqExists.length === 0) {
      return NextResponse.json({ 
        error: "RFQ not found",
        code: "RFQ_NOT_FOUND" 
      }, { status: 404 });
    }

    // Get all insurer quotes for the RFQ with insurer details
    const rfqInsurerQuotes = await db
      .select({
        id: rfqInsurers.id,
        rfqId: rfqInsurers.rfqId,
        insurerId: rfqInsurers.insurerId,
        offeredRatePct: rfqInsurers.offeredRatePct,
        offeredGrossPremium: rfqInsurers.offeredGrossPremium,
        notes: rfqInsurers.notes,
        isSelected: rfqInsurers.isSelected,
        createdAt: rfqInsurers.createdAt,
        updatedAt: rfqInsurers.updatedAt,
        insurerCompanyName: insurers.companyName,
        insurerShortName: insurers.shortName,
        insurerLicenseNumber: insurers.licenseNumber
      })
      .from(rfqInsurers)
      .innerJoin(insurers, eq(rfqInsurers.insurerId, insurers.id))
      .where(eq(rfqInsurers.rfqId, parseInt(rfqId)));

    return NextResponse.json(rfqInsurerQuotes);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfqId, insurerId, offeredRatePct, offeredGrossPremium, notes, isSelected } = body;

    // Validate required fields
    if (!rfqId) {
      return NextResponse.json({ 
        error: "RFQ ID is required",
        code: "MISSING_RFQ_ID" 
      }, { status: 400 });
    }

    if (!insurerId) {
      return NextResponse.json({ 
        error: "Insurer ID is required",
        code: "MISSING_INSURER_ID" 
      }, { status: 400 });
    }

    if (offeredRatePct === undefined || offeredRatePct === null) {
      return NextResponse.json({ 
        error: "Offered rate percentage is required",
        code: "MISSING_OFFERED_RATE" 
      }, { status: 400 });
    }

    if (offeredGrossPremium === undefined || offeredGrossPremium === null) {
      return NextResponse.json({ 
        error: "Offered gross premium is required",
        code: "MISSING_OFFERED_PREMIUM" 
      }, { status: 400 });
    }

    // Validate numeric fields
    if (isNaN(parseInt(rfqId))) {
      return NextResponse.json({ 
        error: "Valid RFQ ID is required",
        code: "INVALID_RFQ_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(insurerId))) {
      return NextResponse.json({ 
        error: "Valid insurer ID is required",
        code: "INVALID_INSURER_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseFloat(offeredRatePct))) {
      return NextResponse.json({ 
        error: "Offered rate must be a valid number",
        code: "INVALID_OFFERED_RATE" 
      }, { status: 400 });
    }

    if (isNaN(parseFloat(offeredGrossPremium))) {
      return NextResponse.json({ 
        error: "Offered gross premium must be a valid number",
        code: "INVALID_OFFERED_PREMIUM" 
      }, { status: 400 });
    }

    // Validate rate percentage range (0-100)
    if (parseFloat(offeredRatePct) < 0 || parseFloat(offeredRatePct) > 100) {
      return NextResponse.json({ 
        error: "Offered rate must be between 0 and 100",
        code: "INVALID_RATE_RANGE" 
      }, { status: 400 });
    }

    // Validate referenced entities exist
    const [rfqExists, insurerExists] = await Promise.all([
      db.select()
        .from(rfqs)
        .where(eq(rfqs.id, parseInt(rfqId)))
        .limit(1),
      db.select()
        .from(insurers)
        .where(eq(insurers.id, parseInt(insurerId)))
        .limit(1)
    ]);

    if (rfqExists.length === 0) {
      return NextResponse.json({ 
        error: "RFQ not found",
        code: "RFQ_NOT_FOUND" 
      }, { status: 404 });
    }

    if (insurerExists.length === 0) {
      return NextResponse.json({ 
        error: "Insurer not found",
        code: "INSURER_NOT_FOUND" 
      }, { status: 404 });
    }

    // Check if quote already exists for this RFQ and insurer combination
    const existingQuote = await db.select()
      .from(rfqInsurers)
      .where(and(
        eq(rfqInsurers.rfqId, parseInt(rfqId)),
        eq(rfqInsurers.insurerId, parseInt(insurerId))
      ))
      .limit(1);

    if (existingQuote.length > 0) {
      return NextResponse.json({ 
        error: "Quote already exists for this RFQ and insurer combination",
        code: "DUPLICATE_QUOTE" 
      }, { status: 400 });
    }

    // Create the quote
    const newQuote = await db.insert(rfqInsurers)
      .values({
        rfqId: parseInt(rfqId),
        insurerId: parseInt(insurerId),
        offeredRatePct: parseFloat(offeredRatePct),
        offeredGrossPremium: parseFloat(offeredGrossPremium),
        notes: notes ? notes.trim() : null,
        isSelected: isSelected === true ? 1 : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Get the created quote with insurer details
    const quoteWithInsurer = await db
      .select({
        id: rfqInsurers.id,
        rfqId: rfqInsurers.rfqId,
        insurerId: rfqInsurers.insurerId,
        offeredRatePct: rfqInsurers.offeredRatePct,
        offeredGrossPremium: rfqInsurers.offeredGrossPremium,
        notes: rfqInsurers.notes,
        isSelected: rfqInsurers.isSelected,
        createdAt: rfqInsurers.createdAt,
        updatedAt: rfqInsurers.updatedAt,
        insurerCompanyName: insurers.companyName,
        insurerShortName: insurers.shortName,
        insurerLicenseNumber: insurers.licenseNumber
      })
      .from(rfqInsurers)
      .innerJoin(insurers, eq(rfqInsurers.insurerId, insurers.id))
      .where(eq(rfqInsurers.id, newQuote[0].id));

    return NextResponse.json(quoteWithInsurer[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}