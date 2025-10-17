import { db } from '@/db';
import { endorsementSequences } from '@/db/schema';

async function main() {
    const sampleEndorsementSequences = [
        {
            entity: 'ENDORSEMENT',
            year: 2024,
            lastSeq: 15,
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-12-15').toISOString(),
        },
        {
            entity: 'ENDORSEMENT',
            year: 2025,
            lastSeq: 3,
            createdAt: new Date('2025-01-01').toISOString(),
            updatedAt: new Date('2025-01-10').toISOString(),
        }
    ];

    await db.insert(endorsementSequences).values(sampleEndorsementSequences);
    
    console.log('✅ Endorsement sequences seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});