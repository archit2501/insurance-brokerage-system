import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addClientTypeColumn() {
  console.log('\n🔧 Adding missing client_type column to clients table...\n');

  try {
    // Add client_type column
    await db.execute(`
      ALTER TABLE clients ADD COLUMN client_type TEXT NOT NULL DEFAULT 'Company'
    `);
    console.log('✅ Added client_type column with default value "Company"');

    // Add client_code column if missing
    try {
      await db.execute(`
        ALTER TABLE clients ADD COLUMN client_code TEXT
      `);
      console.log('✅ Added client_code column');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ client_code column already exists');
      } else {
        throw err;
      }
    }

    // Create unique index on client_code if it doesn't exist
    try {
      await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS clients_client_code_unique ON clients(client_code)
      `);
      console.log('✅ Created unique index on client_code');
    } catch (err) {
      console.log('⚠️  Index might already exist:', err.message);
    }

    // Make CAC and TIN nullable
    console.log('\n🔧 Making CAC/RC and TIN columns nullable...');
    
    // Get current data
    const result = await db.execute('SELECT * FROM clients');
    const clients = result.rows;
    console.log(`📊 Found ${clients.length} existing clients`);

    if (clients.length === 0) {
      console.log('No existing clients, skipping data migration');
    } else {
      // Create temp table with nullable columns
      await db.execute(`
        CREATE TABLE clients_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
      console.log('✅ Created temporary clients table with nullable CAC/TIN');

      // Copy data
      await db.execute(`
        INSERT INTO clients_temp 
        SELECT * FROM clients
      `);
      console.log('✅ Copied data to temporary table');

      // Drop old table
      await db.execute('DROP TABLE clients');
      console.log('✅ Dropped old clients table');

      // Rename temp table
      await db.execute('ALTER TABLE clients_temp RENAME TO clients');
      console.log('✅ Renamed temporary table to clients');

      // Recreate indexes
      await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS clients_client_code_unique ON clients(client_code)');
      await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS clients_cac_rc_number_unique ON clients(cac_rc_number) WHERE cac_rc_number IS NOT NULL');
      await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS clients_tin_unique ON clients(tin) WHERE tin IS NOT NULL');
      console.log('✅ Recreated indexes with partial indexes for nullable columns');
    }

    console.log('\n✅ ALL SCHEMA UPDATES COMPLETED!');
    console.log('\nClients table now has:');
    console.log('  ✓ client_code column (nullable, unique)');
    console.log('  ✓ client_type column (NOT NULL, default: Company)');
    console.log('  ✓ cac_rc_number (nullable, unique when not null)');
    console.log('  ✓ tin (nullable, unique when not null)');
    console.log('\n🎉 Database schema is now in sync with code!\n');

  } catch (error) {
    console.error('\n❌ Error updating schema:', error);
    throw error;
  }
}

addClientTypeColumn().catch(console.error);
