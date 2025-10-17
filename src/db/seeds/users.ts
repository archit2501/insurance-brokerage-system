import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            id: 1,
            fullName: 'Chinwe Adebayo',
            email: 'chinwe.adebayo@company.com',
            phone: '+2348023456789',
            role: 'Admin',
            approvalLevel: 'L3',
            tfaEnabled: true,
            status: 'Active',
            maxOverrideLimit: 50000000,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Password123
            createdAt: new Date('2024-01-01').toISOString(),
            updatedAt: new Date('2024-01-01').toISOString(),
        },
        {
            id: 2,
            fullName: 'Emeka Okafor',
            email: 'emeka.okafor@company.com',
            phone: '+2348034567890',
            role: 'Underwriter',
            approvalLevel: 'L2',
            tfaEnabled: true,
            status: 'Active',
            maxOverrideLimit: 10000000,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            createdAt: new Date('2024-01-05').toISOString(),
            updatedAt: new Date('2024-01-05').toISOString(),
        },
        {
            id: 3,
            fullName: 'Aisha Bello',
            email: 'aisha.bello@company.com',
            phone: '+2348045678901',
            role: 'Viewer',
            approvalLevel: null,
            tfaEnabled: false,
            status: 'Active',
            maxOverrideLimit: 0,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            createdAt: new Date('2024-01-10').toISOString(),
            updatedAt: new Date('2024-01-10').toISOString(),
        },
        {
            id: 4,
            fullName: 'Yusuf Musa',
            email: 'yusuf.musa@company.com',
            phone: '+2348056789012',
            role: 'Underwriter',
            approvalLevel: 'L1',
            tfaEnabled: true,
            status: 'Active',
            maxOverrideLimit: 5000000,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            id: 5,
            fullName: 'Ijeoma Nwosu',
            email: 'ijeoma.nwosu@company.com',
            phone: '+2348067890123',
            role: 'Accounts',
            approvalLevel: null,
            tfaEnabled: false,
            status: 'Active',
            maxOverrideLimit: 0,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            id: 6,
            fullName: 'Kabir Danjuma',
            email: 'kabir.danjuma@company.com',
            phone: '+2348078901234',
            role: 'Admin',
            approvalLevel: 'L3',
            tfaEnabled: true,
            status: 'Active',
            maxOverrideLimit: 100000000,
            passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
            createdAt: new Date('2024-02-01').toISOString(),
            updatedAt: new Date('2024-02-01').toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});