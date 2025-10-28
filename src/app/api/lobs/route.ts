import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lobs } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { authenticateRequest } from '@/app/api/_lib/auth';

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    let query = db.select().from(lobs);

    if (search && status && (status === 'active' || status === 'inactive')) {
      query = query.where(
        and(
          or(
            like(lobs.name, `%${search}%`),
            like(lobs.code, `%${search}%`),
            like(lobs.description, `%${search}%`)
          ),
          eq(lobs.status, status)
        )
      );
    } else if (search) {
      query = query.where(
        or(
          like(lobs.name, `%${search}%`),
          like(lobs.code, `%${search}%`),
          like(lobs.description, `%${search}%`)
        )
      );
    } else if (status && (status === 'active' || status === 'inactive')) {
      query = query.where(eq(lobs.status, status));
    }

    const results = await query
      .orderBy(desc(lobs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET lobs error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const body = await request.json();
    const { 
      name, 
      code, 
      description,
      defaultBrokeragePct = 0,
      defaultVatPct = 7.5,
      rateBasis,
      ratingInputs,
      minPremium = 0,
      wordingRefs
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required', code: 'MISSING_CODE' },
        { status: 400 }
      );
    }

    // Validate percentage fields
    if (defaultBrokeragePct < 0 || defaultBrokeragePct > 100) {
      return NextResponse.json(
        { error: 'Default brokerage percentage must be between 0 and 100', code: 'INVALID_BROKERAGE_PCT' },
        { status: 400 }
      );
    }

    if (defaultVatPct < 0 || defaultVatPct > 100) {
      return NextResponse.json(
        { error: 'Default VAT percentage must be between 0 and 100', code: 'INVALID_VAT_PCT' },
        { status: 400 }
      );
    }

    if (minPremium < 0) {
      return NextResponse.json(
        { error: 'Minimum premium must be non-negative', code: 'INVALID_MIN_PREMIUM' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    //Use raw SQL with client.execute to avoid Drizzle's id:null serialization issue
    await client.execute({
      sql: `INSERT INTO lobs (name, code, description, status, default_brokerage_pct, default_vat_pct, rate_basis, rating_inputs, min_premium, wording_refs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name.trim(),
        code.trim().toUpperCase(),
        description?.trim() || null,
        'active',
        parseFloat(defaultBrokeragePct.toString()),
        parseFloat(defaultVatPct.toString()),
        rateBasis?.trim() || null,
        ratingInputs?.trim() || null,
        minPremium ? parseFloat(minPremium.toString()) : 0,
        wordingRefs?.trim() || null,
        now,
        now
      ]
    });

    // Fetch the newly created LOB
    const newLob = await db.select().from(lobs).where(eq(lobs.code, code.trim().toUpperCase())).limit(1);

    return NextResponse.json(newLob[0], { status: 201 });
  } catch (error) {
    console.error('POST lob error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}