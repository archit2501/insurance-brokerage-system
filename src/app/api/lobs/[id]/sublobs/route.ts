import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subLobs, lobs } from '@/db/schema';
import { eq, and, like, or, desc, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const lobId = parseInt(id);
    
    if (isNaN(lobId)) {
      return NextResponse.json({ 
        error: "Valid LOB ID is required",
        code: "INVALID_LOB_ID"
      }, { status: 400 });
    }

    // Check if LOB exists
    const lobExists = await db.select()
      .from(lobs)
      .where(eq(lobs.id, lobId))
      .limit(1);

    if (lobExists.length === 0) {
      return NextResponse.json({ 
        error: "LOB not found",
        code: "LOB_NOT_FOUND"
      }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select()
      .from(subLobs)
      .where(eq(subLobs.lobId, lobId));

    // Apply search filter
    if (search) {
      query = query.where(
        and(
          eq(subLobs.lobId, lobId),
          or(
            like(subLobs.name, `%${search}%`),
            like(subLobs.code, `%${search}%`),
            like(subLobs.description, `%${search}%`)
          )
        )
      );
    }

    // Apply status filter
    if (status) {
      const statusCondition = eq(subLobs.status, status);
      if (search) {
        query = query.where(
          and(
            eq(subLobs.lobId, lobId),
            or(
              like(subLobs.name, `%${search}%`),
              like(subLobs.code, `%${search}%`),
              like(subLobs.description, `%${search}%`)
            ),
            statusCondition
          )
        );
      } else {
        query = query.where(
          and(eq(subLobs.lobId, lobId), statusCondition)
        );
      }
    }

    // Apply sorting
    const orderBy = order === 'asc' ? asc : desc;
    if (sort === 'name') {
      query = query.orderBy(orderBy(subLobs.name));
    } else if (sort === 'code') {
      query = query.orderBy(orderBy(subLobs.code));
    } else {
      query = query.orderBy(orderBy(subLobs.createdAt));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET sub-LOBs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const lobId = parseInt(id);
    
    if (isNaN(lobId)) {
      return NextResponse.json({ 
        error: "Valid LOB ID is required",
        code: "INVALID_LOB_ID"
      }, { status: 400 });
    }

    // Check if LOB exists
    const lobExists = await db.select()
      .from(lobs)
      .where(eq(lobs.id, lobId))
      .limit(1);

    if (lobExists.length === 0) {
      return NextResponse.json({ 
        error: "LOB not found",
        code: "LOB_NOT_FOUND"
      }, { status: 404 });
    }

    const body = await request.json();
    const { 
      name, 
      code, 
      description,
      overrideBrokeragePct,
      overrideVatPct,
      overrideMinPremium,
      overrideRateBasis,
      overrideRatingInputs,
      wordingRefs
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME"
      }, { status: 400 });
    }

    if (!code || !code.trim()) {
      return NextResponse.json({ 
        error: "Code is required",
        code: "MISSING_CODE"
      }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ 
        error: "Description is required",
        code: "MISSING_DESCRIPTION"
      }, { status: 400 });
    }

    // Validate override percentages if provided
    if (overrideBrokeragePct !== undefined && overrideBrokeragePct !== null) {
      const pct = parseFloat(overrideBrokeragePct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ 
          error: "Override brokerage percentage must be between 0 and 100",
          code: "INVALID_OVERRIDE_BROKERAGE_PCT"
        }, { status: 400 });
      }
    }

    if (overrideVatPct !== undefined && overrideVatPct !== null) {
      const pct = parseFloat(overrideVatPct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ 
          error: "Override VAT percentage must be between 0 and 100",
          code: "INVALID_OVERRIDE_VAT_PCT"
        }, { status: 400 });
      }
    }

    if (overrideMinPremium !== undefined && overrideMinPremium !== null) {
      const premium = parseFloat(overrideMinPremium);
      if (isNaN(premium) || premium < 0) {
        return NextResponse.json({ 
          error: "Override minimum premium must be non-negative",
          code: "INVALID_OVERRIDE_MIN_PREMIUM"
        }, { status: 400 });
      }
    }

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedDescription = description.trim();

    // Check if code is unique within this LOB
    const existingSubLob = await db.select()
      .from(subLobs)
      .where(
        and(
          eq(subLobs.lobId, lobId),
          eq(subLobs.code, trimmedCode)
        )
      )
      .limit(1);

    if (existingSubLob.length > 0) {
      return NextResponse.json({ 
        error: "Sub-LOB code must be unique within the LOB",
        code: "DUPLICATE_CODE"
      }, { status: 400 });
    }

    // Build insert values object - exclude overrideRatingInputs if not provided
    const insertValues: any = {
      lobId,
      name: trimmedName,
      code: trimmedCode,
      description: trimmedDescription,
      overrideBrokeragePct: overrideBrokeragePct !== undefined ? parseFloat(overrideBrokeragePct) || null : null,
      overrideVatPct: overrideVatPct !== undefined ? parseFloat(overrideVatPct) || null : null,
      overrideMinPremium: overrideMinPremium !== undefined ? parseFloat(overrideMinPremium) || null : null,
      overrideRateBasis: overrideRateBasis?.trim() || null,
      wordingRefs: wordingRefs?.trim() || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Only include overrideRatingInputs if it's actually provided and valid
    if (overrideRatingInputs !== undefined && overrideRatingInputs !== null && overrideRatingInputs !== '') {
      try {
        insertValues.overrideRatingInputs = typeof overrideRatingInputs === 'string' 
          ? JSON.parse(overrideRatingInputs) 
          : overrideRatingInputs;
      } catch {
        // Skip invalid JSON
      }
    }

    const newSubLob = await db.insert(subLobs)
      .values(insertValues)
      .returning();

    return NextResponse.json(newSubLob[0], { status: 201 });
  } catch (error) {
    console.error('POST sub-LOB error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}