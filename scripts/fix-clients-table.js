const { createClient } = require('@libsql/client');
require('dotenv').config();

async function fixClientsTable() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🔍 Checking current table structure...');
    
    // Disable foreign keys temporarily
    await client.execute("PRAGMA foreign_keys = OFF;");
    console.log('✅ Disabled foreign keys');
    
    // Check existing table
    const tableInfo = await client.execute("PRAGMA table_info(clients);");
    console.log('Current columns:', tableInfo.rows.map(r => `${r.name} (${r.type}, ${r.notnull ? 'NOT NULL' : 'NULL'})`));
    
    console.log('\n🚀 Recreating clients table with nullable CAC/RC and TIN...');
    
    // Drop clients_new if it exists from previous failed run
    try {
      await client.execute("DROP TABLE IF EXISTS clients_new;");
      console.log('✅ Cleaned up any previous migration attempt');
    } catch (e) {
      // Ignore
    }
    
    // Step 1: Drop indexes
    try {
      await client.execute("DROP INDEX IF EXISTS clients_cac_rc_number_unique;");
      console.log('✅ Dropped cac_rc_number index');
    } catch (e) {
      console.log('⚠️  cac_rc_number index drop:', e.message);
    }
    
    try {
      await client.execute("DROP INDEX IF EXISTS clients_tin_unique;");
      console.log('✅ Dropped tin index');
    } catch (e) {
      console.log('⚠️  tin index drop:', e.message);
    }
    
    // Step 2: Create new table (matching existing column order)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS clients_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        company_name TEXT NOT NULL,
        cac_rc_number TEXT,
        tin TEXT,
        industry TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'Nigeria',
        website TEXT,
        kyc_status TEXT DEFAULT 'pending',
        status TEXT DEFAULT 'active',
        created_by INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        client_code TEXT,
        client_type TEXT DEFAULT 'Company',
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION
      );
    `);
    console.log('✅ Created new table structure');
    
    // Step 3: Copy data with explicit columns
    await client.execute(`
      INSERT INTO clients_new (id, company_name, cac_rc_number, tin, industry, address, city, state, country, website, kyc_status, status, created_by, created_at, updated_at, client_code, client_type)
      SELECT id, company_name, cac_rc_number, tin, industry, address, city, state, country, website, 
             COALESCE(kyc_status, 'pending'), 
             COALESCE(status, 'active'), 
             created_by, created_at, updated_at, client_code, 
             COALESCE(client_type, 'Company')
      FROM clients;
    `);
    console.log('✅ Copied existing data');
    
    // Step 4: Drop old table
    await client.execute('DROP TABLE clients;');
    console.log('✅ Dropped old table');
    
    // Step 5: Rename new table
    await client.execute('ALTER TABLE clients_new RENAME TO clients;');
    console.log('✅ Renamed new table to clients');
    
    // Step 6: Create unique indexes (partial - allowing NULL)
    await client.execute('CREATE UNIQUE INDEX clients_client_code_unique ON clients (client_code) WHERE client_code IS NOT NULL;');
    console.log('✅ Created client_code unique index');
    
    await client.execute('CREATE UNIQUE INDEX clients_cac_rc_number_unique ON clients (cac_rc_number) WHERE cac_rc_number IS NOT NULL;');
    console.log('✅ Created cac_rc_number unique index (nullable)');
    
    await client.execute('CREATE UNIQUE INDEX clients_tin_unique ON clients (tin) WHERE tin IS NOT NULL;');
    console.log('✅ Created tin unique index (nullable)');
    
    // Re-enable foreign keys
    await client.execute("PRAGMA foreign_keys = ON;");
    console.log('✅ Re-enabled foreign keys');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('✅ CAC/RC and TIN are now nullable for Individual clients');
    
    // Verify
    const newTableInfo = await client.execute("PRAGMA table_info(clients);");
    console.log('\nNew columns:', newTableInfo.rows.map(r => `${r.name} (${r.type}, ${r.notnull ? 'NOT NULL' : 'NULL'})`));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

fixClientsTable();
