import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const now = new Date().toISOString();
    
    const newClient = await db.insert(clients)
      .values({
        clientCode: 'TEST-001',
        companyName: 'Test Company PLC',
        cacRcNumber: 'RC123456',
        tin: 'TIN1234567890',
        kycStatus: 'pending',
        status: 'active',
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json({
      success: true,
      client: newClient[0]
    }, { status: 201 });

  } catch (error: any) {
    console.error('Detailed error creating minimal client:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      cause: error?.cause,
      stack: error?.stack,
      fullError: error
    });
    
    let errorMessage = 'Unknown error';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.message?.includes('UNIQUE constraint failed')) {
      if (error.message.includes('clients.client_code')) {
        errorMessage = 'Client code already exists';
        errorCode = 'DUPLICATE_CLIENT_CODE';
      } else if (error.message.includes('clients.cac_rc_number')) {
        errorMessage = 'CAC RC number already exists';
        errorCode = 'DUPLICATE_CAC_RC';
      } else if (error.message.includes('clients.tin')) {
        errorMessage = 'TIN already exists';
        errorCode = 'DUPLICATE_TIN';
      } else {
        errorMessage = 'Unique constraint violation';
        errorCode = 'UNIQUE_CONSTRAINT';
      }
    } else if (error?.message) {
      errorMessage = error.message;
      errorCode = 'INSERT_ERROR';
    }
    
    return NextResponse.json({ 
      error: 'Failed to create minimal test client',
      message: errorMessage,
      code: errorCode,
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}