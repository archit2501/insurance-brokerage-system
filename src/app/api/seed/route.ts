import { NextRequest, NextResponse } from 'next/server';
import { runSeeds } from '@/db/seeds';

export async function POST(request: NextRequest) {
  try {
    console.log("Starting seed process...");
    await runSeeds();
    
    return NextResponse.json({ 
      success: true, 
      message: "Database seeded successfully with Nigerian LOBs and Insurers" 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to seed database: ' + error.message 
    }, { status: 500 });
  }
}