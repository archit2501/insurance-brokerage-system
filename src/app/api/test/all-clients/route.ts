import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const allClients = await db.select().from(clients);
    
    return NextResponse.json(allClients);
  } catch (error) {
    console.error('Debug clients error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch clients: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'This debug route only supports GET requests'
  }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'This debug route only supports GET requests'
  }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'This debug route only supports GET requests'
  }, { status: 405 });
}