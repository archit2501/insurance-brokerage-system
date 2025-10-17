import { NextRequest, NextResponse } from 'next/server';
import { nextEntityCode } from '../_lib/sequences';
import { db } from '@/db';

export async function POST(request: NextRequest) {
  try {
    const { entity, type } = await request.json();

    if (!entity) {
      return NextResponse.json({ 
        error: "Entity is required",
        code: "MISSING_ENTITY" 
      }, { status: 400 });
    }

    const result = await nextEntityCode(db, { entity, type });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Sequence test error:', error);
    return NextResponse.json({ 
      error: 'Sequence generation failed: ' + error?.message || error,
      code: "SEQUENCE_FAILED"
    }, { status: 500 });
  }
}