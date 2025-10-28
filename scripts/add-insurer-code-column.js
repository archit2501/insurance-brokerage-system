import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addInsurerCodeColumn() {
  console.log('🔧 Adding insurer_code column to insurers table...\n');

  try {
    // Check if the column already exists
    const tableInfo = await client.execute('PRAGMA table_info(insurers);');
    const columnExists = tableInfo.rows.some(row => row.name === 'insurer_code');

    if (columnExists) {
      console.log('✅ insurer_code column already exists');
      return;
    }

    // Add the insurer_code column
    console.log('Adding insurer_code column...');
    await client.execute(`
      ALTER TABLE insurers ADD COLUMN insurer_code TEXT;
    `);
    console.log('✅ Added insurer_code column');

    // Create a unique index on insurer_code
    console.log('Creating unique index on insurer_code...');
    await client.execute(`
      CREATE UNIQUE INDEX insurers_insurer_code_unique ON insurers(insurer_code);
    `);
    console.log('✅ Created unique index');

    // Verify the column was added
    const updatedTableInfo = await client.execute('PRAGMA table_info(insurers);');
    const newColumn = updatedTableInfo.rows.find(row => row.name === 'insurer_code');

    console.log('\n✅ SUCCESS! insurer_code column added successfully');
    console.log('Column details:', {
      cid: newColumn.cid,
      name: newColumn.name,
      type: newColumn.type,
      notnull: newColumn.notnull,
      dflt_value: newColumn.dflt_value,
      pk: newColumn.pk
    });

    // Display the table structure
    console.log('\n📋 Current insurers table structure:');
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

addInsurerCodeColumn();
