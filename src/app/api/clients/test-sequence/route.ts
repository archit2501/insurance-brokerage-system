import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, sequences, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Simple auth helper for test route
function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1 };
}

// Generate client code with year override capability
async function generateClientCode(year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const entity = 'client';
  
  // Start transaction for atomic sequence generation
  return await db.transaction(async (tx) => {
    // Try to get existing sequence for this year
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
    const clientCode = `MEIBL/CL/${currentYear}/${nextSeq.toString().padStart(5, '0')}`;
    return clientCode;
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    
    // Validate year parameter if provided
    let year: number | undefined;
    if (yearParam) {
      year = parseInt(yearParam);
      if (isNaN(year) || year < 1900 || year > 2100) {
        return NextResponse.json({ 
          error: 'Year must be a 4-digit number between 1900 and 2100',
          code: 'INVALID_YEAR'
        }, { status: 400 });
      }
    }
    
    const generatedCodes: string[] = [];
    const testClientIds: number[] = [];
    
    try {
      // Test 1: Generate first client code
      const code1 = await generateClientCode(year);
      generatedCodes.push(code1);
      
      // Create minimal test client 1
      const testClient1 = await db.insert(clients).values({
        clientCode: code1,
        companyName: `TEST COMPANY ${code1.replace(/\//g, '_')}`,
        cacRcNumber: `CAC_${Date.now()}_1`,
        tin: `TIN_${Date.now()}_1`,
        industry: 'Testing',
        address: 'Test Address 1',
        city: 'Test City',
        state: 'Test State',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      testClientIds.push(testClient1[0].id);
      
      // Test 2: Generate second client code (should increment by 1)
      const code2 = await generateClientCode(year);
      generatedCodes.push(code2);
      
      // Create minimal test client 2
      const testClient2 = await db.insert(clients).values({
        clientCode: code2,
        companyName: `TEST COMPANY ${code2.replace(/\//g, '_')}`,
        cacRcNumber: `CAC_${Date.now()}_2`,
        tin: `TIN_${Date.now()}_2`,
        industry: 'Testing',
        address: 'Test Address 2',
        city: 'Test City',
        state: 'Test State',
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      testClientIds.push(testClient2[0].id);
      
      // Verify sequence numbers are sequential
      const seq1 = parseInt(code1.split('/').pop() || '0');
      const seq2 = parseInt(code2.split('/').pop() || '0');
      const isSequential = seq2 === seq1 + 1;
      
      const result = {
        message: 'Client code sequence test completed successfully',
        generatedCodes,
        testResults: {
          sequential: isSequential,
          year: year || new Date().getFullYear(),
          sequences: [seq1, seq2]
        },
        cleanupCompleted: false,
        timestamp: new Date().toISOString()
      };
      
      // Clean up test data
      for (const clientId of testClientIds) {
        await db.delete(clients).where(eq(clients.id, clientId));
      }
      result.cleanupCompleted = true;
      
      return NextResponse.json(result);
      
    } catch (error) {
      // Clean up any created test clients on error
      for (const clientId of testClientIds) {
        try {
          await db.delete(clients).where(eq(clients.id, clientId));
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Test sequence generator error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    
    const body = await request.json();
    const { year } = body;
    
    // Validate year if provided
    if (year !== undefined) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return NextResponse.json({ 
          error: 'Year must be a number between 1900 and 2100',
          code: 'INVALID_YEAR'
        }, { status: 400 });
      }
    }
    
    const currentYear = year || new Date().getFullYear();
    const generatedCodes: string[] = [];

    // Test sequence reset between different years
    if (year && year !== new Date().getFullYear()) {
      // Generate code for current year
      const currentYearCode = await generateClientCode();
      generatedCodes.push(currentYearCode);

      // Generate code for specified year (should start at 00001)
      const specifiedYearCode = await generateClientCode(year);
      generatedCodes.push(specifiedYearCode);
      
      // Verify different years reset sequence
      const currentSeq = parseInt(currentYearCode.split('/').pop() || '0');
      const specifiedSeq = parseInt(specifiedYearCode.split('/').pop() || '0');
      const sequenceReset = specifiedSeq === 1;
      
      // Clean up any created test data
      const testClients = await db.select()
        .from(clients)
        .where(and(
          eq(clients.companyName, `TEST COMPANY ${currentYearCode.replace(/\//g, '_')}`),
          eq(clients.createdBy, user.id)
        ))
        .limit(2);
      
      if (testClients.length > 0) {
        await db.delete(clients).where(eq(clients.id, testClients[0].id));
      }
      
      return NextResponse.json({
        message: 'Cross-year sequence test completed',
        generatedCodes,
        testResults: {
          sequenceReset,
          currentYearSeq: currentSeq,
          specifiedYearSeq: specifiedSeq
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Default behavior - generate sequence for current year
    const code1 = await generateClientCode(currentYear);
    generatedCodes.push(code1);
    
    const code2 = await generateClientCode(currentYear);
    generatedCodes.push(code2);
    
    // Create minimal test clients for verification
    try {
      const testClient1 = await db.insert(clients).values({
        clientCode: code1,
        companyName: `TEST COMPANY ${code1.replace(/\//g, '_')}`,
        cacRcNumber: `CAC_${Date.now()}_1`,
        tin: `TIN_${Date.now()}_1`,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      
      const testClient2 = await db.insert(clients).values({
        clientCode: code2,
        companyName: `TEST COMPANY ${code2.replace(/\//g, '_')}`,
        cacRcNumber: `CAC_${Date.now()}_2`,
        tin: `TIN_${Date.now()}_2`,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();
      
      // Clean up
      await db.delete(clients).where(eq(clients.id, testClient1[0].id));
      await db.delete(clients).where(eq(clients.id, testClient2[0].id));
      
    } catch (cleanupError) {
      console.warn('Test cleanup error:', cleanupError);
    }
    
    const seq1 = parseInt(code1.split('/').pop() || '0');
    const seq2 = parseInt(code2.split('/').pop() || '0');
    
    return NextResponse.json({
      message: 'Sequence generation test completed',
      generatedCodes,
      testResults: {
        sequential: seq2 === seq1 + 1,
        year: currentYear,
        sequences: [seq1, seq2],
        format: 'MEIBL/CL/{YYYY}/{00001}'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test sequence generator POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}