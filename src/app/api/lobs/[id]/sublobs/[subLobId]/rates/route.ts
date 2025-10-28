import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lobs, subLobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '@/app/api/_lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subLobId: string }> }
) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const lobId = parseInt(resolvedParams.id);
    const subLobId = parseInt(resolvedParams.subLobId);

    if (isNaN(lobId) || isNaN(subLobId)) {
      return NextResponse.json(
        { error: 'Invalid LOB or Sub-LOB ID' },
        { status: 400 }
      );
    }

    // Fetch parent LOB defaults first
    const lobResult = await db
      .select({
        minPremium: lobs.minPremium,
        defaultBrokeragePct: lobs.defaultBrokeragePct,
        defaultVatPct: lobs.defaultVatPct,
        rateBasis: lobs.rateBasis,
        ratingInputs: lobs.ratingInputs,
      })
      .from(lobs)
      .where(eq(lobs.id, lobId))
      .limit(1);

    if (lobResult.length === 0) {
      return NextResponse.json(
        { error: 'LOB not found' },
        { status: 404 }
      );
    }

    const lobDefaults = lobResult[0];

    // Fetch sub-LOB overrides
    const subLobResult = await db
      .select({
        id: subLobs.id,
        name: subLobs.name,
        code: subLobs.code,
        overrideMinPremium: subLobs.overrideMinPremium,
        overrideBrokeragePct: subLobs.overrideBrokeragePct,
        overrideVatPct: subLobs.overrideVatPct,
        overrideRateBasis: subLobs.overrideRateBasis,
        overrideRatingInputs: subLobs.overrideRatingInputs,
      })
      .from(subLobs)
      .where(eq(subLobs.id, subLobId))
      .limit(1);

    if (subLobResult.length === 0) {
      return NextResponse.json(
        { error: 'Sub-LOB not found' },
        { status: 404 }
      );
    }

    const subLob = subLobResult[0];

    // Apply sub-LOB overrides if present, otherwise use LOB defaults
    return NextResponse.json({
      minPremium: subLob.overrideMinPremium !== null ? subLob.overrideMinPremium : (lobDefaults.minPremium || 0),
      defaultBrokeragePct: subLob.overrideBrokeragePct !== null ? subLob.overrideBrokeragePct : (lobDefaults.defaultBrokeragePct || 0),
      defaultVatPct: subLob.overrideVatPct !== null ? subLob.overrideVatPct : (lobDefaults.defaultVatPct || 7.5),
      rateBasis: subLob.overrideRateBasis || lobDefaults.rateBasis,
      ratingInputs: subLob.overrideRatingInputs || lobDefaults.ratingInputs,
      subLobName: subLob.name,
      subLobCode: subLob.code,
    });
  } catch (error) {
    console.error('GET Sub-LOB rates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
