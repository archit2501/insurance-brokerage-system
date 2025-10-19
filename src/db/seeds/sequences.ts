import { db } from '@/db';
import { centralizedSequences as sequences } from '@/db/schema';

async function main() {
    const sampleSequences = [
        {
            scope: 'client',
            year: 2023,
            lastSeq: 15,
            createdAt: new Date('2023-12-01').toISOString(),
            updatedAt: new Date('2023-12-31').toISOString(),
        },
        {
            scope: 'client',
            year: 2024,
            lastSeq: 8,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-06-15').toISOString(),
        },
        {
            scope: 'client',
            year: 2025,
            lastSeq: 2,
            createdAt: new Date('2025-01-01').toISOString(),
            updatedAt: new Date('2025-01-15').toISOString(),
        },
        {
            scope: 'policy',
            year: 2024,
            lastSeq: 125,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-12-01').toISOString(),
        }
    ];

    await db.insert(sequences).values(sampleSequences);
    
    console.log('✅ Sequences seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});