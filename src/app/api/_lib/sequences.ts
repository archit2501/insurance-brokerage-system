import { db } from '@/db';
import { entitySequences } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

type EntityType = 'CLIENT' | 'BANK' | 'INSURER' | 'AGENT' | 'POLICY';

interface EntityCodeResult {
  code: string;
  year: number;
  seq: number;
}

export async function nextEntityCode(
  dbInstance: any,
  { entity, type }: { entity: EntityType; type?: string }
): Promise<EntityCodeResult> {
  try {
    const currentYear = new Date().getFullYear();
    
    // Normalize type for CLIENT and AGENT entities
    let normalizedType: string | undefined;
    if (entity === 'CLIENT' || entity === 'AGENT') {
      if (type?.toLowerCase() === 'individual' || type === 'IND') {
        normalizedType = 'IND';
      } else if (type?.toLowerCase() === 'corporate' || type === 'CORP') {
        normalizedType = 'CORP';
      } else {
        throw new Error(`Type is required for ${entity} entity and must be 'individual' or 'corporate'`);
      }
    }

    // First, ensure the entity_sequences table exists (workaround for migration issues)
    try {
      await dbInstance.execute(sql`
        CREATE TABLE IF NOT EXISTS entity_sequences (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          entity TEXT NOT NULL,
          year INTEGER NOT NULL,
          last_seq INTEGER DEFAULT 0 NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      
      await dbInstance.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS unique_entity_year ON entity_sequences (entity, year)
      `);
    } catch (tableError) {
      console.log('Table creation skipped (may already exist):', tableError);
    }

    // Get existing sequence for entity and year using provided db instance (supports tx)
    const existingSequence = await dbInstance
      .select()
      .from(entitySequences)
      .where(and(
        eq(entitySequences.entity, entity),
        eq(entitySequences.year, currentYear)
      ))
      .limit(1);

    let seq: number;
    const now = new Date().toISOString();

    if (existingSequence.length > 0) {
      // Increment existing sequence
      seq = existingSequence[0].lastSeq + 1;
      await dbInstance
        .update(entitySequences)
        .set({ 
          lastSeq: seq,
          updatedAt: now 
        })
        .where(and(
          eq(entitySequences.entity, entity),
          eq(entitySequences.year, currentYear)
        ));
    } else {
      // Create new sequence for this entity and year
      seq = 1;
      await dbInstance
        .insert(entitySequences)
        .values({
          entity,
          year: currentYear,
          lastSeq: seq,
          createdAt: now,
          updatedAt: now
        });
    }

    // Build code based on entity type
    let code: string;
    const paddedSeq = seq.toString().padStart(5, '0');

    switch (entity) {
      case 'CLIENT':
        code = `MEIBL/CL/${currentYear}/${normalizedType}/${paddedSeq}`;
        break;
      case 'BANK':
        code = `MEIBL/BK/${currentYear}/${paddedSeq}`;
        break;
      case 'INSURER':
        code = `MEIBL/IN/${currentYear}/${paddedSeq}`;
        break;
      case 'AGENT':
        code = `MEIBL/AG/${currentYear}/${normalizedType}/${paddedSeq}`;
        break;
      case 'POLICY':
        code = `MEIBL/PL/${currentYear}/${paddedSeq}`;
        break;
      default:
        throw new Error(`Invalid entity type: ${entity}`);
    }

    return { code, year: currentYear, seq };

  } catch (error) {
    console.error('nextEntityCode error:', error);
    throw error;
  }
}