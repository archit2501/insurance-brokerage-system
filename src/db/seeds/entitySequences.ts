import { db } from '@/db';
import { entitySequences } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        // Check if table exists
        const tableExists = await db.run(sql`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='entity_sequences'
        `);

        if (!tableExists.results || tableExists.results.length === 0) {
            throw new Error('entity_sequences table does not exist');
        }

        // Clear existing data
        await db.delete(entitySequences);
        console.log('🧹 Cleared existing entity sequences');

        // Create entity sequences for 2025
        const entities = ['CLIENT', 'BANK', 'INSURER', 'AGENT', 'POLICY'];
        const currentYear = 2025;
        const now = new Date().toISOString();

        const sequenceData = entities.map(entity => ({
            entity,
            year: currentYear,
            lastSeq: 0,
            createdAt: now,
            updatedAt: now
        }));

        await db.insert(entitySequences).values(sequenceData);
        
        console.log('✅ Entity sequences seeder completed successfully');
        
    } catch (error) {
        console.error('❌ Seeder failed:', error);
        throw error;
    }
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});