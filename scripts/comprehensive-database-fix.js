import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function comprehensiveDatabaseFix() {
  console.log('\n========================================');
  console.log('   COMPREHENSIVE DATABASE FIX');
  console.log('========================================\n');

  try {
    // 1. Get existing clients data
    console.log('📊 Step 1: Checking existing clients...');
    const existingClients = await db.execute('SELECT * FROM clients');
    console.log(`   Found ${existingClients.rows.length} existing clients`);

    // 2. Drop and recreate clients table with correct schema
    console.log('\n🔧 Step 2: Recreating clients table with nullable CAC/TIN...');
    
    // Drop existing table
    await db.execute('DROP TABLE IF EXISTS clients');
    console.log('   ✅ Dropped old clients table');

    // Create new clients table with correct schema
    await db.execute(`
      CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        client_code TEXT UNIQUE,
        company_name TEXT NOT NULL,
        client_type TEXT NOT NULL DEFAULT 'Company',
        cac_rc_number TEXT,
        tin TEXT,
        industry TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'Nigeria',
        website TEXT,
        kyc_status TEXT NOT NULL DEFAULT 'pending',
        status TEXT NOT NULL DEFAULT 'active',
        created_by INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (created_by) REFERENCES user(id)
      )
    `);
    console.log('   ✅ Created new clients table (CAC/TIN are now NULLABLE)');

    // Create indexes with partial indexes for nullable unique columns
    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS clients_cac_rc_number_unique 
      ON clients(cac_rc_number) 
      WHERE cac_rc_number IS NOT NULL
    `);
    console.log('   ✅ Created partial unique index on cac_rc_number');

    await db.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS clients_tin_unique 
      ON clients(tin) 
      WHERE tin IS NOT NULL
    `);
    console.log('   ✅ Created partial unique index on tin');

    // Restore existing clients if any
    if (existingClients.rows.length > 0) {
      console.log(`\n   Restoring ${existingClients.rows.length} existing clients...`);
      for (const client of existingClients.rows) {
        await db.execute({
          sql: `INSERT INTO clients (id, client_code, company_name, client_type, cac_rc_number, tin, 
                industry, address, city, state, country, website, kyc_status, status, 
                created_by, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            client.id, client.client_code, client.company_name, client.client_type || 'Company',
            client.cac_rc_number || null, client.tin || null, client.industry, client.address,
            client.city, client.state, client.country, client.website, client.kyc_status,
            client.status, client.created_by, client.created_at, client.updated_at
          ]
        });
      }
      console.log('   ✅ Restored all existing clients');
    }

    // 3. Verify all required tables exist
    console.log('\n🔍 Step 3: Verifying all required tables...');
    
    const tables = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log('\n   📋 Existing tables:');
    const tableNames = tables.rows.map(r => r.name);
    tableNames.forEach(name => console.log(`      ✓ ${name}`));

    // List of required tables
    const requiredTables = [
      'clients', 'contacts', 'kyc_files',
      'insurers', 'insurer_emails',
      'agents', 'agent_contacts', 'agent_kyc_files',
      'lobs', 'sub_lobs',
      'bank_accounts',
      'policies', 'endorsements',
      'notes', 'cn_insurer_shares', 'note_sequences',
      'rfqs', 'rfq_insurers',
      'reminders', 'dispatch_logs', 'audit_logs',
      'entity_sequences', 'endorsement_sequences',
      'user', 'session', 'account', 'verification'
    ];

    console.log('\n   🔍 Missing tables:');
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    if (missingTables.length === 0) {
      console.log('      ✅ No missing tables! All required tables exist.');
    } else {
      missingTables.forEach(name => console.log(`      ⚠️  ${name}`));
    }

    // 4. Create missing critical tables
    if (!tableNames.includes('bank_accounts')) {
      console.log('\n🔧 Step 4: Creating bank_accounts table...');
      await db.execute(`
        CREATE TABLE bank_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          account_name TEXT NOT NULL,
          account_number TEXT NOT NULL,
          bank_name TEXT NOT NULL,
          branch TEXT,
          currency TEXT DEFAULT 'NGN' NOT NULL,
          owner_type TEXT NOT NULL,
          owner_id INTEGER NOT NULL,
          is_primary INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS owner_type_id_idx ON bank_accounts(owner_type, owner_id)
      `);
      await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS unique_account_owner_idx 
        ON bank_accounts(account_number, owner_type, owner_id)
      `);
      console.log('   ✅ Created bank_accounts table');
    }

    if (!tableNames.includes('agents')) {
      console.log('\n🔧 Creating agents table...');
      await db.execute(`
        CREATE TABLE agents (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          agent_code TEXT UNIQUE,
          full_name TEXT NOT NULL,
          company_name TEXT,
          agent_type TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT,
          city TEXT,
          state TEXT,
          country TEXT DEFAULT 'Nigeria',
          cac_rc_number TEXT,
          tin TEXT,
          license_number TEXT,
          default_commission_pct REAL DEFAULT 0,
          status TEXT DEFAULT 'active' NOT NULL,
          created_by INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (created_by) REFERENCES user(id)
        )
      `);
      console.log('   ✅ Created agents table');
    }

    // 5. Check table schemas
    console.log('\n🔍 Step 5: Checking clients table schema...');
    const schema = await db.execute(`PRAGMA table_info(clients)`);
    console.log('\n   Clients table columns:');
    schema.rows.forEach(col => {
      const nullable = col.notnull === 0 ? '(nullable)' : '(NOT NULL)';
      const def = col.dflt_value ? `default: ${col.dflt_value}` : '';
      console.log(`      ${col.name}: ${col.type} ${nullable} ${def}`.trim());
    });

    console.log('\n========================================');
    console.log('   ✅ DATABASE FIX COMPLETED!');
    console.log('========================================');
    console.log('\n📊 Summary:');
    console.log(`   • Total tables: ${tableNames.length}`);
    console.log(`   • Missing tables: ${missingTables.length}`);
    console.log('   • CAC/RC: NULLABLE ✓');
    console.log('   • TIN: NULLABLE ✓');
    console.log('   • client_type: Present ✓');
    console.log('   • client_code: Present ✓');
    console.log('\n🎉 You can now create Individual clients without CAC/TIN!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

comprehensiveDatabaseFix().catch(console.error);
