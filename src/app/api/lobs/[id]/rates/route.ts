import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '@/app/api/_lib/auth';

export async function GET(
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
    const lobId = parseInt(resolvedParams.id);

    if (isNaN(lobId)) {
      return NextResponse.json(
        { error: 'Invalid LOB ID' },
        { status: 400 }
      );
    }

    // Fetch LOB with rate information
    const result = await db
      .select({
        id: lobs.id,
        name: lobs.name,
        code: lobs.code,
        minPremium: lobs.minPremium,
        defaultBrokeragePct: lobs.defaultBrokeragePct,
        defaultVatPct: lobs.defaultVatPct,
        rateBasis: lobs.rateBasis,
        ratingInputs: lobs.ratingInputs,
      })
      .from(lobs)
      .where(eq(lobs.id, lobId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'LOB not found' },
        { status: 404 }
      );
    }

    const lob = result[0];

    return NextResponse.json({
      minPremium: lob.minPremium || 0,
      defaultBrokeragePct: lob.defaultBrokeragePct || 0,
      defaultVatPct: lob.defaultVatPct || 7.5,
      rateBasis: lob.rateBasis,
      ratingInputs: lob.ratingInputs,
      lobName: lob.name,
      lobCode: lob.code,
    });
  } catch (error) {
    console.error('GET LOB rates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
