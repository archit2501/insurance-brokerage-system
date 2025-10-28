import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const now = new Date().toISOString();

const lobsData = [
  // 1. MOTOR INSURANCE
  {
    name: 'Motor Insurance',
    code: 'MOTOR',
    description: 'Motor vehicle insurance coverage',
    defaultBrokeragePct: 12.5,
    defaultVatPct: 7.5,
    rateBasis: 'Premium',
    minPremium: 5000,
    subLobs: [
      { name: 'Private Motor', code: 'MOTOR-PVT', description: 'Private vehicles' },
      { name: 'Commercial Motor', code: 'MOTOR-COM', description: 'Commercial vehicles' },
      { name: 'Motor Cycle', code: 'MOTOR-MC', description: 'Motorcycles and scooters' },
      { name: 'Motor Fleet', code: 'MOTOR-FLEET', description: 'Fleet of vehicles' },
    ]
  },

  // 2. FIRE & SPECIAL PERILS
  {
    name: 'Fire & Special Perils',
    code: 'FIRE',
    description: 'Fire and allied perils insurance',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 10000,
    subLobs: [
      { name: 'Fire & Special Perils', code: 'FIRE-FSP', description: 'Standard fire coverage' },
      { name: 'Consequential Loss', code: 'FIRE-CL', description: 'Business interruption' },
      { name: 'Burglary', code: 'FIRE-BURG', description: 'Burglary and housebreaking' },
      { name: 'Stock', code: 'FIRE-STK', description: 'Stock in trade' },
    ]
  },

  // 3. MARINE INSURANCE
  {
    name: 'Marine Insurance',
    code: 'MARINE',
    description: 'Marine cargo and hull insurance',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 15000,
    subLobs: [
      { name: 'Marine Cargo', code: 'MARINE-CARGO', description: 'Goods in transit by sea' },
      { name: 'Marine Hull', code: 'MARINE-HULL', description: 'Ship and vessel insurance' },
      { name: 'Inland Transit', code: 'MARINE-INLAND', description: 'Inland cargo transit' },
      { name: 'All Risks', code: 'MARINE-AR', description: 'All risks cargo' },
    ]
  },

  // 4. ENGINEERING INSURANCE
  {
    name: 'Engineering Insurance',
    code: 'ENGINEERING',
    description: 'Engineering and construction risks',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 20000,
    subLobs: [
      { name: 'Contractors All Risks', code: 'ENG-CAR', description: 'Construction projects' },
      { name: 'Erection All Risks', code: 'ENG-EAR', description: 'Plant erection' },
      { name: 'Machinery Breakdown', code: 'ENG-MB', description: 'Machinery breakdown' },
      { name: 'Electronic Equipment', code: 'ENG-EE', description: 'Electronic equipment' },
      { name: 'Boiler & Pressure Vessel', code: 'ENG-BPV', description: 'Boilers and pressure vessels' },
    ]
  },

  // 5. LIABILITY INSURANCE
  {
    name: 'Liability Insurance',
    code: 'LIABILITY',
    description: 'Third party liability coverage',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Premium',
    minPremium: 15000,
    subLobs: [
      { name: 'Public Liability', code: 'LIAB-PUB', description: 'Public liability' },
      { name: 'Product Liability', code: 'LIAB-PROD', description: 'Product liability' },
      { name: 'Professional Indemnity', code: 'LIAB-PI', description: 'Professional indemnity' },
      { name: 'Employers Liability', code: 'LIAB-EMP', description: 'Employers liability' },
      { name: 'Directors & Officers', code: 'LIAB-DO', description: 'Directors and officers' },
    ]
  },

  // 6. ACCIDENT & HEALTH
  {
    name: 'Accident & Health',
    code: 'ACCIDENT',
    description: 'Personal accident and health insurance',
    defaultBrokeragePct: 12.5,
    defaultVatPct: 7.5,
    rateBasis: 'Premium',
    minPremium: 5000,
    subLobs: [
      { name: 'Personal Accident', code: 'ACC-PA', description: 'Personal accident' },
      { name: 'Group Personal Accident', code: 'ACC-GPA', description: 'Group personal accident' },
      { name: 'Health Insurance', code: 'ACC-HI', description: 'Health insurance' },
      { name: 'Travel Insurance', code: 'ACC-TRV', description: 'Travel insurance' },
      { name: 'Student Protection', code: 'ACC-STU', description: 'Student protection' },
    ]
  },

  // 7. BOND & GUARANTEES
  {
    name: 'Bonds & Guarantees',
    code: 'BOND',
    description: 'Performance and surety bonds',
    defaultBrokeragePct: 10,
    defaultVatPct: 7.5,
    rateBasis: 'Bond Value',
    minPremium: 25000,
    subLobs: [
      { name: 'Performance Bond', code: 'BOND-PERF', description: 'Contract performance bonds' },
      { name: 'Advance Payment Bond', code: 'BOND-APG', description: 'Advance payment guarantee' },
      { name: 'Bid Bond', code: 'BOND-BID', description: 'Tender bid bonds' },
      { name: 'Retention Bond', code: 'BOND-RET', description: 'Retention money bond' },
      { name: 'Custom Bond', code: 'BOND-CUST', description: 'Customs bonds' },
    ]
  },

  // 8. AVIATION INSURANCE
  {
    name: 'Aviation Insurance',
    code: 'AVIATION',
    description: 'Aircraft and aviation risks',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 50000,
    subLobs: [
      { name: 'Aviation Hull', code: 'AVI-HULL', description: 'Aircraft hull insurance' },
      { name: 'Aviation Liability', code: 'AVI-LIAB', description: 'Aviation third party liability' },
      { name: 'Passenger Liability', code: 'AVI-PAX', description: 'Passenger legal liability' },
      { name: 'Airport Operators', code: 'AVI-APT', description: 'Airport operators insurance' },
    ]
  },

  // 9. ENERGY INSURANCE
  {
    name: 'Energy Insurance',
    code: 'ENERGY',
    description: 'Oil, gas and energy sector insurance',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 100000,
    subLobs: [
      { name: 'Offshore Energy', code: 'ENERGY-OFF', description: 'Offshore oil and gas' },
      { name: 'Onshore Energy', code: 'ENERGY-ON', description: 'Onshore oil and gas' },
      { name: 'Renewable Energy', code: 'ENERGY-REN', description: 'Wind, solar energy projects' },
      { name: 'Pipeline', code: 'ENERGY-PIPE', description: 'Pipeline insurance' },
    ]
  },

  // 10. CYBER INSURANCE
  {
    name: 'Cyber Insurance',
    code: 'CYBER',
    description: 'Cyber security and data breach insurance',
    defaultBrokeragePct: 12.5,
    defaultVatPct: 7.5,
    rateBasis: 'Premium',
    minPremium: 50000,
    subLobs: [
      { name: 'Cyber Liability', code: 'CYBER-LIAB', description: 'Cyber liability coverage' },
      { name: 'Data Breach', code: 'CYBER-DATA', description: 'Data breach response' },
      { name: 'Business Interruption', code: 'CYBER-BI', description: 'Cyber business interruption' },
      { name: 'Ransomware', code: 'CYBER-RANSOM', description: 'Ransomware protection' },
    ]
  },

  // 11. AGRICULTURAL INSURANCE
  {
    name: 'Agricultural Insurance',
    code: 'AGRIC',
    description: 'Agricultural and crop insurance',
    defaultBrokeragePct: 10,
    defaultVatPct: 7.5,
    rateBasis: 'Sum Insured',
    minPremium: 10000,
    subLobs: [
      { name: 'Crop Insurance', code: 'AGRIC-CROP', description: 'Crop insurance' },
      { name: 'Livestock Insurance', code: 'AGRIC-LIVE', description: 'Livestock insurance' },
      { name: 'Farm Property', code: 'AGRIC-FARM', description: 'Farm property insurance' },
      { name: 'Aquaculture', code: 'AGRIC-AQUA', description: 'Fish farming insurance' },
    ]
  },

  // 12. SPECIAL RISKS
  {
    name: 'Special Risks',
    code: 'SPECIAL',
    description: 'Specialized and miscellaneous risks',
    defaultBrokeragePct: 15,
    defaultVatPct: 7.5,
    rateBasis: 'Premium',
    minPremium: 20000,
    subLobs: [
      { name: 'Kidnap & Ransom', code: 'SPEC-KR', description: 'Kidnap and ransom' },
      { name: 'Political Violence', code: 'SPEC-PV', description: 'Political violence and terrorism' },
      { name: 'Event Insurance', code: 'SPEC-EVENT', description: 'Special event coverage' },
      { name: 'Art & Specie', code: 'SPEC-ART', description: 'Fine art and valuables' },
      { name: 'Legal Expenses', code: 'SPEC-LEG', description: 'Legal expenses insurance' },
    ]
  },
];

async function seedLOBs() {
  try {
    console.log('🌱 Starting LOB seeding...\n');

    for (const lobData of lobsData) {
      console.log(`📦 Processing: ${lobData.name} (${lobData.code})`);

      // Check if LOB exists
      const existing = await db.execute({
        sql: 'SELECT id FROM lobs WHERE code = ?',
        args: [lobData.code]
      });

      let lobId;

      if (existing.rows.length > 0) {
        lobId = existing.rows[0].id;
        console.log(`   ℹ️  LOB already exists (ID: ${lobId})`);
      } else {
        // Insert LOB
        const result = await db.execute({
          sql: `INSERT INTO lobs (
            name, code, description, status, 
            default_brokerage_pct, default_vat_pct, 
            rate_basis, min_premium, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            lobData.name,
            lobData.code,
            lobData.description,
            'active',
            lobData.defaultBrokeragePct,
            lobData.defaultVatPct,
            lobData.rateBasis,
            lobData.minPremium,
            now,
            now
          ]
        });

        lobId = result.lastInsertRowid;
        console.log(`   ✅ LOB created (ID: ${lobId})`);
      }

      // Insert Sub-LOBs
      for (const subLob of lobData.subLobs) {
        const existingSub = await db.execute({
          sql: 'SELECT id FROM sub_lobs WHERE lob_id = ? AND code = ?',
          args: [lobId, subLob.code]
        });

        if (existingSub.rows.length > 0) {
          console.log(`      ↳ ${subLob.name} (already exists)`);
        } else {
          await db.execute({
            sql: `INSERT INTO sub_lobs (
              lob_id, name, code, description, status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              lobId,
              subLob.name,
              subLob.code,
              subLob.description,
              'active',
              now,
              now
            ]
          });
          console.log(`      ✅ ${subLob.name}`);
        }
      }

      console.log('');
    }

    // Summary
    const lobCount = await db.execute('SELECT COUNT(*) as count FROM lobs');
    const subLobCount = await db.execute('SELECT COUNT(*) as count FROM sub_lobs');

    console.log('🎉 Seeding complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   LOBs: ${lobCount.rows[0].count}`);
    console.log(`   Sub-LOBs: ${subLobCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error seeding LOBs:', error);
    process.exit(1);
  }
}

seedLOBs();
