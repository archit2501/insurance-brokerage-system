import { db } from '@/db';
import { clientSequences } from '@/db/schema';

async function main() {
    const sampleClientSequences = [
        {
            year: 2023,
            type: null,
            lastSeq: 15,
            createdAt: new Date('2023-01-01T00:00:00Z').toISOString(),
            updatedAt: new Date('2023-12-31T23:59:59Z').toISOString(),
        },
        {
            year: 2024,
            type: null,
            lastSeq: 8,
            createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
            updatedAt: new Date('2024-12-31T23:59:59Z').toISOString(),
        },
        {
            year: 2025,
            type: null,
            lastSeq: 2,
            createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
            updatedAt: new Date('2025-01-15T12:30:00Z').toISOString(),
        }
    ];

    await db.insert(clientSequences).values(sampleClientSequences);
    
    console.log('✅ Client sequences seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});