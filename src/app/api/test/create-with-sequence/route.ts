import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, sequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Simple auth helper
function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1 };
}

// Generate client code atomically using transaction
async function generateClientCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const entity = 'client';
  
  return await db.transaction(async (tx) => {
    // Get existing sequence for this year
    const existingSequence = await tx
      .select()
      .from(sequences)
      .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)))
      .limit(1);
    
    let nextSeq: number;
    const now = new Date().toISOString();
    
    if (existingSequence.length > 0) {
      // Increment existing sequence
      nextSeq = existingSequence[0].lastSeq + 1;
      await tx
        .update(sequences)
        .set({ 
          lastSeq: nextSeq,
          updatedAt: now 
        })
        .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)));
    } else {
      // Create new sequence for this year
      nextSeq = 1;
      await tx
        .insert(sequences)
        .values({
          entity,
          year: currentYear,
          lastSeq: nextSeq,
          createdAt: now,
          updatedAt: now
        });
    }
    
    // Build client code: MEIBL/CL/{YYYY}/{00001}
    return `MEIBL/CL/${currentYear}/${nextSeq.toString().padStart(5, '0')}`;
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    
    const {
      companyName = 'Test Sequence Client',
      cacRcNumber = 'RC-TEST-' + Date.now(),
      tin = 'TIN-TEST-' + Date.now(),
      industry = 'Testing',
      address = '123 Test Address',
      city = 'Lagos',
      state = 'Lagos'
    } = body;

    // Generate client code atomically
    const clientCode = await generateClientCode();
    
    // Create new client
    const newClient = await db.insert(clients)
      .values({
        clientCode,
        companyName,
        cacRcNumber,
        tin,
        industry,
        address,
        city,
        state,
        country: 'Nigeria',
        kycStatus: 'pending',
        status: 'active',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Client created with sequence generation',
      client: newClient[0],
      generatedCode: clientCode
    }, { status: 201 });

  } catch (error) {
    console.error('Sequence creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}