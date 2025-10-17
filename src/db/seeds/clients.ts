import { db } from '@/db';
import { clients, clientSequences, users } from '@/db/schema';

async function main() {
    // First, ensure we have a user to reference as createdBy
    const existingUsers = await db.select().from(users).limit(1);
    let createdByUserId = 1;
    
    if (existingUsers.length === 0) {
        // Create a default admin user if none exists
        const defaultUser = await db.insert(users).values({
            fullName: 'System Administrator',
            email: 'admin@meibl.com',
            role: 'Admin',
            approvalLevel: 'L3',
            status: 'Active',
            passwordHash: '$2b$10$dummyhash', // In production, use a proper hash
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-01-01').toISOString(),
        }).returning({ id: users.id });
        
        createdByUserId = defaultUser[0].id;
    } else {
        createdByUserId = existingUsers[0].id;
    }

    // Initialize or update sequence for client codes
    const currentYear = 2024;
    const entityType = null; // Phase 1: no client type
    
    await db.insert(clientSequences).values({
        year: currentYear,
        type: entityType,
        lastSeq: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
        target: [clientSequences.year, clientSequences.type],
        set: { 
            lastSeq: 3,
            updatedAt: new Date().toISOString()
        }
    });

    // Sample clients with proper client codes following MEIBL/CL/{YYYY}/{00001} format
    const sampleClients = [
        {
            clientCode: 'MEIBL/CL/2024/00001',
            companyName: 'Atlantic Petroleum Services Limited',
            cacRcNumber: 'RC-123456',
            tin: '12345678901',
            industry: 'Oil & Gas',
            address: 'Plot 15, Lekki Phase 1',
            city: 'Lekki',
            state: 'Lagos',
            country: 'Nigeria',
            website: 'https://atlanticpetro-ng.com',
            kycStatus: 'verified',
            status: 'active',
            createdBy: createdByUserId,
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            clientCode: 'MEIBL/CL/2024/00002',
            companyName: 'Global Tech Solutions Nigeria Plc',
            cacRcNumber: 'RC-234567',
            tin: '23456789012',
            industry: 'Technology',
            address: '4th Floor, TechHub, Isaac John Street',
            city: 'Ikeja',
            state: 'Lagos',
            country: 'Nigeria',
            website: 'https://globaltechsolutions.com.ng',
            kycStatus: 'verified',
            status: 'active',
            createdBy: createdByUserId,
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            clientCode: 'MEIBL/CL/2024/00003',
            companyName: 'Premier Manufacturing Industries Limited',
            cacRcNumber: 'RC-345678',
            tin: '34567890123',
            industry: 'Manufacturing',
            address: 'Industrial Estate, Oregun',
            city: 'Ikeja',
            state: 'Lagos',
            country: 'Nigeria',
            website: 'https://premiermanufacturing.com',
            kycStatus: 'pending',
            status: 'active',
            createdBy: createdByUserId,
            createdAt: new Date('2024-01-25').toISOString(),
            updatedAt: new Date('2024-01-25').toISOString(),
        }
    ];

    await db.insert(clients).values(sampleClients);
    
    console.log('✅ Clients seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});