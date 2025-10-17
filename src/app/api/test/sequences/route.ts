import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sequences } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const allSequences = await db.select().from(sequences);
    
    return NextResponse.json({
      success: true,
      data: allSequences,
      count: allSequences.length,
      tableName: 'sequences'
    });
  } catch (error) {
    console.error('Sequences debug route error:', error);
    
    let errorMessage = 'Internal server error';
    let errorType = 'UNKNOWN_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('no such table')) {
        errorType = 'TABLE_NOT_FOUND';
      } else if (errorMessage.includes('SQLITE') || errorMessage.includes('sql')) {
        errorType = 'DATABASE_ERROR';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorType,
      description: 'Failed to retrieve sequences. Check if the table exists in the database.'
    }, { status: 500 });
  }
}