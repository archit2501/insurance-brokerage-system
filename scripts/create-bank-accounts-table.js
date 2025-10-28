import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createBankAccountsTable() {
  console.log('🔧 Creating bank_accounts table...\n');

  try {
    // Check if table exists
    const tables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='bank_accounts';
    `);

    if (tables.rows.length > 0) {
      console.log('✅ bank_accounts table already exists');
      
      // Show current structure
      const tableInfo = await client.execute('PRAGMA table_info(bank_accounts);');
      console.log('\n📋 Current bank_accounts table structure:');
      tableInfo.rows.forEach(row => {
        const nullability = row.notnull ? 'NOT NULL' : 'NULL';
        const defaultVal = row.dflt_value ? `DEFAULT ${row.dflt_value}` : '';
        console.log(`  ${row.name} (${row.type}) ${nullability} ${defaultVal}`.trim());
      });
      return;
    }

    console.log('Creating bank_accounts table...');
    await client.execute(`
      CREATE TABLE bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        bank_code TEXT UNIQUE,
        owner_type TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        bank_name TEXT NOT NULL,
        branch TEXT,
        account_number TEXT NOT NULL,
        account_country TEXT NOT NULL DEFAULT 'NG',
        currency TEXT NOT NULL DEFAULT 'NGN',
        swift_bic TEXT,
        usage_receivable INTEGER DEFAULT 0,
        usage_payable INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        statement_source TEXT NOT NULL DEFAULT 'Manual',
        gl_code TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    console.log('✅ Created bank_accounts table');

    // Create indexes
    console.log('Creating indexes...');
    await client.execute(`
      CREATE INDEX owner_type_id_idx ON bank_accounts(owner_type, owner_id);
    `);
    console.log('✅ Created owner_type_id_idx');

    await client.execute(`
      CREATE INDEX unique_account_owner_idx ON bank_accounts(owner_type, owner_id, account_number, account_country);
    `);
    console.log('✅ Created unique_account_owner_idx');

    // Create unique index on bank_code
    await client.execute(`
      CREATE UNIQUE INDEX bank_accounts_bank_code_unique ON bank_accounts(bank_code);
    `);
    console.log('✅ Created bank_code unique index');

    // Verify the table was created
    const tableInfo = await client.execute('PRAGMA table_info(bank_accounts);');
    
    console.log('\n✅ SUCCESS! bank_accounts table created successfully');
    console.log(`\n📋 Bank_accounts table structure (${tableInfo.rows.length} columns):`);
    tableInfo.rows.forEach(row => {
      const nullability = row.notnull ? 'NOT NULL' : 'NULL';
      const defaultVal = row.dflt_value ? `DEFAULT ${row.dflt_value}` : '';
      console.log(`  ${row.name} (${row.type}) ${nullability} ${defaultVal}`.trim());
    });

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.close();
  }
}

createBankAccountsTable();
