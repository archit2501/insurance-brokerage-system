import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addBankCodeColumn() {
  console.log('🔧 Adding bank_code column to bank_accounts table...\n');

  try {
    // Check if the column already exists
    const tableInfo = await client.execute('PRAGMA table_info(bank_accounts);');
    const columnExists = tableInfo.rows.some(row => row.name === 'bank_code');

    if (columnExists) {
      console.log('✅ bank_code column already exists');
      return;
    }

    // Add the bank_code column
    console.log('Adding bank_code column...');
    await client.execute(`
      ALTER TABLE bank_accounts ADD COLUMN bank_code TEXT;
    `);
    console.log('✅ Added bank_code column');

    // Create a unique index on bank_code
    console.log('Creating unique index on bank_code...');
    await client.execute(`
      CREATE UNIQUE INDEX bank_accounts_bank_code_unique ON bank_accounts(bank_code);
    `);
    console.log('✅ Created unique index');

    // Verify the column was added
    const updatedTableInfo = await client.execute('PRAGMA table_info(bank_accounts);');
    const newColumn = updatedTableInfo.rows.find(row => row.name === 'bank_code');

    console.log('\n✅ SUCCESS! bank_code column added successfully');
    console.log('Column details:', {
      cid: newColumn.cid,
      name: newColumn.name,
      type: newColumn.type,
      notnull: newColumn.notnull,
      dflt_value: newColumn.dflt_value,
      pk: newColumn.pk
    });

    // Display the table structure
    console.log('\n📋 Current bank_accounts table structure:');
    updatedTableInfo.rows.forEach(row => {
      const nullability = row.notnull ? 'NOT NULL' : 'NULL';
      const defaultVal = row.dflt_value ? `DEFAULT ${row.dflt_value}` : '';
      console.log(`   ${row.name} (${row.type}) ${nullability} ${defaultVal}`);
    });

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.close();
  }
}

addBankCodeColumn();
