import { db } from '@/db';
import { insurerEmails } from '@/db/schema';

async function main() {
    const sampleInsurerEmails = [
        // Insurer 1 - Leadway
        {
            insurerId: 1,
            role: 'underwriter',
            email: 'underwriting@leadway.com',
            active: true,
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            insurerId: 1,
            role: 'marketer',
            email: 'marketing@leadway.com',
            active: true,
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            insurerId: 1,
            role: 'MD',
            email: 'md@leadway.com',
            active: true,
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            insurerId: 1,
            role: 'claims',
            email: 'claims@leadway.com',
            active: true,
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            insurerId: 1,
            role: 'technical',
            email: 'technical@leadway.com',
            active: true,
            createdAt: new Date('2024-01-10').toISOString(),
        },
        // Insurer 2 - AIICO
        {
            insurerId: 2,
            role: 'underwriter',
            email: 'underwriting@aiicoplc.com',
            active: true,
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            insurerId: 2,
            role: 'marketer',
            email: 'marketing@aiicoplc.com',
            active: true,
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            insurerId: 2,
            role: 'MD',
            email: 'md@aiicoplc.com',
            active: true,
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            insurerId: 2,
            role: 'claims',
            email: 'claims@aiicoplc.com',
            active: true,
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            insurerId: 2,
            role: 'technical',
            email: 'technical@aiicoplc.com',
            active: true,
            createdAt: new Date('2024-01-12').toISOString(),
        },
        // Insurer 3 - AXA Mansard
        {
            insurerId: 3,
            role: 'underwriter',
            email: 'underwriting@axamansard.com',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            insurerId: 3,
            role: 'marketer',
            email: 'marketing@axamansard.com',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            insurerId: 3,
            role: 'MD',
            email: 'md@axamansard.com',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            insurerId: 3,
            role: 'claims',
            email: 'claims@axamansard.com',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            insurerId: 3,
            role: 'technical',
            email: 'technical@axamansard.com',
            active: true,
            createdAt: new Date('2024-01-15').toISOString(),
        },
        // Insurer 4 - NSIA
        {
            insurerId: 4,
            role: 'underwriter',
            email: 'underwriting@nsia.com.ng',
            active: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            insurerId: 4,
            role: 'marketer',
            email: 'marketing@nsia.com.ng',
            active: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            insurerId: 4,
            role: 'MD',
            email: 'md@nsia.com.ng',
            active: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            insurerId: 4,
            role: 'claims',
            email: 'claims@nsia.com.ng',
            active: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        {
            insurerId: 4,
            role: 'technical',
            email: 'technical@nsia.com.ng',
            active: true,
            createdAt: new Date('2024-01-18').toISOString(),
        },
        // Insurer 5 - Custodian
        {
            insurerId: 5,
            role: 'underwriter',
            email: 'underwriting@custodianplc.com.ng',
            active: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            insurerId: 5,
            role: 'marketer',
            email: 'marketing@custodianplc.com.ng',
            active: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            insurerId: 5,
            role: 'MD',
            email: 'md@custodianplc.com.ng',
            active: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            insurerId: 5,
            role: 'claims',
            email: 'claims@custodianplc.com.ng',
            active: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
        {
            insurerId: 5,
            role: 'technical',
            email: 'technical@custodianplc.com.ng',
            active: true,
            createdAt: new Date('2024-01-20').toISOString(),
        },
    ];

    await db.insert(insurerEmails).values(sampleInsurerEmails);
    
    console.log('✅ Insurer emails seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});