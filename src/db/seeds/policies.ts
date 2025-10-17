import { db } from '@/db';
import { policies } from '@/db/schema';

async function main() {
    const samplePolicies = [
        {
            policyNumber: 'POL2024001',
            clientId: 1,
            insurerId: 1,
            lobId: 1,
            subLobId: 1,
            sumInsured: 2000000,
            grossPremium: 125000,
            currency: 'NGN',
            policyStartDate: '2024-06-01',
            policyEndDate: '2025-06-01',
            confirmationDate: '2024-06-01',
            status: 'active',
            createdBy: 1,
            createdAt: new Date('2024-06-01').toISOString(),
            updatedAt: new Date('2024-06-01').toISOString(),
        },
        {
            policyNumber: 'POL2024002',
            clientId: 2,
            insurerId: 2,
            lobId: 2,
            subLobId: 2,
            sumInsured: 5000000,
            grossPremium: 85000,
            currency: 'NGN',
            policyStartDate: '2024-07-01',
            policyEndDate: '2025-07-01',
            confirmationDate: '2024-07-01',
            status: 'active',
            createdBy: 1,
            createdAt: new Date('2024-07-01').toISOString(),
            updatedAt: new Date('2024-07-01').toISOString(),
        },
        {
            policyNumber: 'POL2024003',
            clientId: 3,
            insurerId: 1,
            lobId: 3,
            subLobId: 3,
            sumInsured: 3000000,
            grossPremium: 45000,
            currency: 'NGN',
            policyStartDate: '2024-08-01',
            policyEndDate: '2025-08-01',
            confirmationDate: '2024-08-01',
            status: 'active',
            createdBy: 1,
            createdAt: new Date('2024-08-01').toISOString(),
            updatedAt: new Date('2024-08-01').toISOString(),
        },
        {
            policyNumber: 'POL2024004',
            clientId: 1,
            insurerId: 3,
            lobId: 4,
            subLobId: 4,
            sumInsured: 1000000,
            grossPremium: 25000,
            currency: 'NGN',
            policyStartDate: '2024-09-01',
            policyEndDate: '2025-09-01',
            confirmationDate: '2024-09-01',
            status: 'active',
            createdBy: 1,
            createdAt: new Date('2024-09-01').toISOString(),
            updatedAt: new Date('2024-09-01').toISOString(),
        },
        {
            policyNumber: 'POL2024005',
            clientId: 2,
            insurerId: 2,
            lobId: 6,
            subLobId: 5,
            sumInsured: 500000,
            grossPremium: 15000,
            currency: 'NGN',
            policyStartDate: '2024-10-01',
            policyEndDate: '2025-10-01',
            confirmationDate: '2024-10-01',
            status: 'active',
            createdBy: 1,
            createdAt: new Date('2024-10-01').toISOString(),
            updatedAt: new Date('2024-10-01').toISOString(),
        },
    ];

    await db.insert(policies).values(samplePolicies);
    
    console.log('✅ Policies seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});