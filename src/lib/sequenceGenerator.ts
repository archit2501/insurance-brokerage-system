import { db } from '@/db';
import { centralizedSequences, clientSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface SequenceGenerationError extends Error {
  code: string;
}

export async function generateSequenceNumber(scope: string, year?: number): Promise<number> {
  const currentYear = year || new Date().getFullYear();
  const currentTimestamp = new Date().toISOString();
  
  try {
    // Use upsert pattern with conflict resolution
    const result = await db.transaction(async (tx) => {
      // Try to select existing sequence for this scope and year
      const existingSequence = await tx.select()
        .from(centralizedSequences)
        .where(and(eq(centralizedSequences.scope, scope), eq(centralizedSequences.year, currentYear)))
        .limit(1);
      
      if (existingSequence.length > 0) {
        // Update existing sequence, increment by 1
        const updated = await tx.update(centralizedSequences)
          .set({
            lastSeq: existingSequence[0].lastSeq + 1,
            updatedAt: currentTimestamp
          })
          .where(and(eq(centralizedSequences.scope, scope), eq(centralizedSequences.year, currentYear)))
          .returning();
        
        if (updated.length === 0) {
          throw new Error('Failed to update sequence');
        }
        
        return updated[0].lastSeq;
      } else {
        // Create new sequence starting at 1
        const newSequence = await tx.insert(centralizedSequences)
          .values({
            scope,
            year: currentYear,
            lastSeq: 1,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp
          })
          .returning();
        
        if (newSequence.length === 0) {
          throw new Error('Failed to create sequence');
        }
        
        return newSequence[0].lastSeq;
      }
    });
    
    return result;
  } catch (error) {
    console.error('Generate sequence number error:', error);
    const dbError: SequenceGenerationError = new Error(
      'Failed to generate sequence number: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
    dbError.code = 'SEQUENCE_GENERATION_FAILED';
    throw dbError;
  }
}

export async function generateClientCode(clientType: 'Individual' | 'Corporate', year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const typeCode = clientType === 'Individual' ? 'IND' : 'CORP';
  const currentTimestamp = new Date().toISOString();
  
  try {
    // Get the next sequence number for clients
    const sequenceNumber = await db.transaction(async (tx) => {
      // Select or create/update sequence for this client type and year
      const existingSequence = await tx.select()
        .from(clientSequences)
        .where(and(eq(clientSequences.year, currentYear), eq(clientSequences.type, typeCode)))
        .limit(1);
      
      if (existingSequence.length > 0) {
        // Increment existing sequence
        const updated = await tx.update(clientSequences)
          .set({
            lastSeq: existingSequence[0].lastSeq + 1,
            updatedAt: currentTimestamp
          })
          .where(and(eq(clientSequences.year, currentYear), eq(clientSequences.type, typeCode)))
          .returning();
        
        if (updated.length === 0) {
          throw new Error('Failed to update client sequence');
        }
        
        return updated[0].lastSeq;
      } else {
        // Create new sequence starting at 1
        const newSequence = await tx.insert(clientSequences)
          .values({
            year: currentYear,
            type: typeCode,
            lastSeq: 1,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp
          })
          .returning();
        
        if (newSequence.length === 0) {
          throw new Error('Failed to create client sequence');
        }
        
        return newSequence[0].lastSeq;
      }
    });
    
    // Format client code: MEIBL/CL/{YYYY}/{TYPE}/{00001}
    const sequencePadded = sequenceNumber.toString().padStart(5, '0');
    return `MEIBL/CL/${currentYear}/${typeCode}/${sequencePadded}`;
  } catch (error) {
    console.error('Generate client code error:', error);
    const dbError: SequenceGenerationError = new Error(
      'Failed to generate client code: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
    dbError.code = 'CLIENT_CODE_GENERATION_FAILED';
    throw dbError;
  }
}