import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Create a test client record
    const newClient = await db.insert(clients).values({
      clientCode: 'MEIBL/CL/2025/00999',
      companyName: 'Test Company Limited',
      cacRcNumber: 'RC-123456789',
      tin: '12345678-0001',
      industry: 'Insurance',
      address: '123 Test Street, Lagos',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      website: 'https://testcompany.example.com',
      kycStatus: 'pending',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Test client record inserted successfully',
      client: newClient[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Test insertion error:', error);
    return NextResponse.json({ 
      error: 'Test insertion failed: ' + error 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const testClient = await db.select()
      .from(clients)
      .where(eq(clients.clientCode, 'MEIBL/CL/2025/00999'))
      .limit(1);

    if (testClient.length === 0) {
      return NextResponse.json({ 
        error: 'Test client record not found',
        found: false
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      found: true,
      client: testClient[0]
    }, { status: 200 });

  } catch (error) {
    console.error('Test query error:', error);
    return NextResponse.json({ 
      error: 'Test query failed: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const deletedClient = await db.delete(clients)
      .where(eq(clients.clientCode, 'MEIBL/CL/2025/00999'))
      .returning();

    if (deletedClient.length === 0) {
      return NextResponse.json({ 
        error: 'Test client record not found',
        deleted: false
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test client record deleted successfully',
      deletedRecord: deletedClient[0]
    }, { status: 200 });

  } catch (error) {
    console.error('Test deletion error:', error);
    return NextResponse.json({ 
      error: 'Test deletion failed: ' + error 
    }, { status: 500 });
  }
}