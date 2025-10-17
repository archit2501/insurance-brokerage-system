import { db } from '@/db';
import { subLobs } from '@/db/schema';

async function main() {
    // Clear existing sub-LOBs data first
    await db.delete(subLobs);
    
    const sampleSubLobs = [
        // Motor Insurance (lobId: 1)
        {
            lobId: 1,
            name: 'Motor Third Party',
            code: 'MTP',
            description: 'Third party motor insurance covering liability to third parties',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: null,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'MTP-001, MTP-STD-2024',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            lobId: 1,
            name: 'Motor Comprehensive',
            code: 'MCO',
            description: 'Comprehensive motor insurance covering own damage and third party liability',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: 75000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'MCO-001, MCO-COMP-2024',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        
        // Fire & Special Perils (lobId: 2)
        {
            lobId: 2,
            name: 'Fire Insurance',
            code: 'FIRE',
            description: 'Fire insurance covering damage by fire and allied perils',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: null,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'FIRE-001, FSP-FIRE-2024',
            createdAt: new Date('2024-01-16').toISOString(),
            updatedAt: new Date('2024-01-16').toISOString(),
        },
        {
            lobId: 2,
            name: 'Burglary',
            code: 'BURG',
            description: 'Burglary insurance covering theft and housebreaking',
            status: 'active',
            overrideBrokeragePct: 12.0,
            overrideVatPct: null,
            overrideMinPremium: 30000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'BURG-001, FSP-BURG-2024',
            createdAt: new Date('2024-01-16').toISOString(),
            updatedAt: new Date('2024-01-16').toISOString(),
        },
        
        // Marine Insurance (lobId: 3)
        {
            lobId: 3,
            name: 'Marine Cargo',
            code: 'CARGO',
            description: 'Marine cargo insurance covering goods in transit',
            status: 'active',
            overrideBrokeragePct: 15.0,
            overrideVatPct: null,
            overrideMinPremium: 50000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'CARGO-001, MAR-CARGO-2024',
            createdAt: new Date('2024-01-17').toISOString(),
            updatedAt: new Date('2024-01-17').toISOString(),
        },
        {
            lobId: 3,
            name: 'Marine Hull',
            code: 'HULL',
            description: 'Marine hull insurance covering vessels and watercraft',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: null,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'HULL-001, MAR-HULL-2024',
            createdAt: new Date('2024-01-17').toISOString(),
            updatedAt: new Date('2024-01-17').toISOString(),
        },
        
        // General Accident (lobId: 4)
        {
            lobId: 4,
            name: 'Personal Accident',
            code: 'PAC',
            description: 'Personal accident insurance covering bodily injury and death',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: 15000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'PAC-001, GA-PAC-2024',
            createdAt: new Date('2024-01-18').toISOString(),
            updatedAt: new Date('2024-01-18').toISOString(),
        },
        {
            lobId: 4,
            name: 'Public Liability',
            code: 'PUB',
            description: 'Public liability insurance covering third party claims',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: null,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'PUB-001, GA-PUB-2024',
            createdAt: new Date('2024-01-18').toISOString(),
            updatedAt: new Date('2024-01-18').toISOString(),
        },
        
        // Bonds & Guarantees (lobId: 5)
        {
            lobId: 5,
            name: 'Performance Bond',
            code: 'PERF',
            description: 'Performance bond guaranteeing contract performance',
            status: 'active',
            overrideBrokeragePct: 3.0,
            overrideVatPct: null,
            overrideMinPremium: 500000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'PERF-001, BG-PERF-2024',
            createdAt: new Date('2024-01-19').toISOString(),
            updatedAt: new Date('2024-01-19').toISOString(),
        },
        {
            lobId: 5,
            name: 'Bid Bond',
            code: 'BID',
            description: 'Bid bond guaranteeing tender bid commitment',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: null,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'BID-001, BG-BID-2024',
            createdAt: new Date('2024-01-19').toISOString(),
            updatedAt: new Date('2024-01-19').toISOString(),
        },
        
        // Travel Insurance (lobId: 6)
        {
            lobId: 6,
            name: 'Schengen Travel',
            code: 'SCHEN',
            description: 'Travel insurance for Schengen area countries',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: 25000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'SCHEN-001, TRV-SCHEN-2024',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            lobId: 6,
            name: 'Worldwide Travel',
            code: 'WORLD',
            description: 'Worldwide travel insurance covering all destinations',
            status: 'active',
            overrideBrokeragePct: null,
            overrideVatPct: null,
            overrideMinPremium: 35000,
            overrideRateBasis: null,
            overrideRatingInputs: null,
            wordingRefs: 'WORLD-001, TRV-WORLD-2024',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        }
    ];

    await db.insert(subLobs).values(sampleSubLobs);
    
    console.log('✅ Sub Lines of Business seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});