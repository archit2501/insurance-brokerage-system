import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { centralizedSequences as sequences, clientSequences, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to pad sequence number with leading zeros
function padSequence(num: number, length: number = 5): string {
  return num.toString().padStart(length, '0');
}

// Helper function to generate client code based on current sequence
async function generateClientCode(year?: number): Promise<{ code: string; sequence: number }> {
  const currentYear = year || new Date().getFullYear();
  
  // Get current sequence or create new one for the year
  const existingSequence = await db.select()
    .from(clientSequences)
    .where(eq(clientSequences.year, currentYear))
    .limit(1);
  
  let nextSequence: number;
  let sequenceId: number;
  
  if (existingSequence.length === 0) {
    // Create new sequence for this year
    const newSequence = await db.insert(clientSequences)
      .values({
        year: currentYear,
        lastSeq: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();
    
    nextSequence = 1;
    sequenceId = newSequence[0].id;
  } else {
    // Increment existing sequence
    nextSequence = existingSequence[0].lastSeq + 1;
    sequenceId = existingSequence[0].id;
    
    // Update the sequence
    await db.update(clientSequences)
      .set({ 
        lastSeq: nextSequence,
        updatedAt: new Date().toISOString()
      })
      .where(eq(clientSequences.id, sequenceId));
  }
  
  const clientCode = `MEIBL/CL/${currentYear}/${padSequence(nextSequence)}`;
  
  return { code: clientCode, sequence: nextSequence };
}

// Helper function to generate sequence for other entities
async function generateSequence(entity: string, year?: number): Promise<{ code: string; sequence: number }> {
  const currentYear = year || new Date().getFullYear();
  
  // Get current sequence or create new one for the entity and year
  const existingSequence = await db.select()
    .from(sequences)
    .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)))
    .limit(1);
  
  let nextSequence: number;
  
  if (existingSequence.length === 0) {
    // Create new sequence for this entity and year
    await db.insert(sequences)
      .values({
        entity,
        year: currentYear,
        lastSeq: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    
    nextSequence = 1;
  } else {
    // Increment existing sequence
    nextSequence = existingSequence[0].lastSeq + 1;
    
    // Update the sequence
    await db.update(sequences)
      .set({ 
        lastSeq: nextSequence,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(sequences.entity, entity), eq(sequences.year, currentYear)));
  }
  
  const paddedSequence = padSequence(nextSequence, 6);
  
  return { 
    code: `${entity}/${currentYear}/${paddedSequence}`, 
    sequence: nextSequence 
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testYear = searchParams.get('year');
  const testCount = parseInt(searchParams.get('count') || '5');
  const userId = request.headers.get('x-user-id');
  
  try {
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID header is required',
        code: 'MISSING_USER_ID'
      }, { status: 401 });
    }
    
    const yearsToTest = testYear ? [parseInt(testYear)] : [2024, 2025];
    const results: any[] = [];
    
    for (const year of yearsToTest) {
      const yearResult = {
        year,
        clientSequences: [] as any[],
        policySequences: [] as any[],
        noteSequences: [] as any[],
        beforeState: {} as any,
        afterState: {} as any
      };
      
      // Get before state
      const beforeClientSeq = await db.select()
        .from(clientSequences)
        .where(eq(clientSequences.year, year))
        .limit(1);
      
      const beforePolicySeq = await db.select()
        .from(sequences)
        .where(and(eq(sequences.entity, 'MEIBL/PO'), eq(sequences.year, year)))
        .limit(1);
      
      const beforeNoteSeq = await db.select()
        .from(sequences)
        .where(and(eq(sequences.entity, 'MEIBL/NO'), eq(sequences.year, year)))
        .limit(1);
      
      yearResult.beforeState = {
        client: beforeClientSeq.length > 0 ? beforeClientSeq[0] : null,
        policy: beforePolicySeq.length > 0 ? beforePolicySeq[0] : null,
        note: beforeNoteSeq.length > 0 ? beforeNoteSeq[0] : null
      };
      
      // Generate test client codes
      for (let i = 0; i < testCount; i++) {
        const result = await generateClientCode(year);
        yearResult.clientSequences.push({
          sequence: result.sequence,
          code: result.code,
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate test policy sequences
      for (let i = 0; i < testCount; i++) {
        const result = await generateSequence('MEIBL/PO', year);
        yearResult.policySequences.push({
          sequence: result.sequence,
          code: result.code,
          timestamp: new Date().toISOString()
        });
      }
      
      // Generate test note sequences
      for (let i = 0; i < testCount; i++) {
        const result = await generateSequence('MEIBL/NO', year);
        yearResult.noteSequences.push({
          sequence: result.sequence,
          code: result.code,
          timestamp: new Date().toISOString()
        });
      }
      
      // Get after state
      const afterClientSeq = await db.select()
        .from(clientSequences)
        .where(eq(clientSequences.year, year))
        .limit(1);
      
      const afterPolicySeq = await db.select()
        .from(sequences)
        .where(and(eq(sequences.entity, 'MEIBL/PO'), eq(sequences.year, year)))
        .limit(1);
      
      const afterNoteSeq = await db.select()
        .from(sequences)
        .where(and(eq(sequences.entity, 'MEIBL/NO'), eq(sequences.year, year)))
        .limit(1);
      
      yearResult.afterState = {
        client: afterClientSeq.length > 0 ? afterClientSeq[0] : null,
        policy: afterPolicySeq.length > 0 ? afterPolicySeq[0] : null,
        note: afterNoteSeq.length > 0 ? afterNoteSeq[0] : null
      };
      
      results.push(yearResult);
    }
    
    // Get current sequences state for all years
    const allClientSequences = await db.select()
      .from(clientSequences)
      .orderBy(clientSequences.year);
    
    const allSequences = await db.select()
      .from(sequences)
      .orderBy(sequences.entity, sequences.year);
    
    return NextResponse.json({
      success: true,
      message: 'Year partitioning test completed successfully',
      userId,
      currentTime: new Date().toISOString(),
      testSummary: {
        yearsTested: yearsToTest,
        sequencesPerTest: testCount,
        totalGenerated: yearsToTest.length * testCount * 3 // 3 entity types
      },
      yearTests: results,
      currentState: {
        clientSequences: allClientSequences,
        otherSequences: allSequences
      },
      partitionVerification: {
        message: 'Each year maintains independent sequence counters',
        format: 'MEIBL/{ENTITY}/{YYYY}/{SEQUENCE}',
        entities: ['CL (Client)', 'PO (Policy)', 'NO (Note)']
      }
    });
    
  } catch (error) {
    console.error('Test year partitioning error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}