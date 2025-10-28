import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixSubLobsTable() {
  console.log('🔧 Checking and fixing sub_lobs table...\n');

  try {
    // Check if table exists
    const tables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='sub_lobs';
    `);

    if (tables.rows.length === 0) {
      console.log('⚠️  sub_lobs table does not exist. Creating it...');
      
      await client.execute(`
        CREATE TABLE sub_lobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          lob_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          override_brokerage_pct REAL,
          override_vat_pct REAL,
          override_min_premium REAL,
          override_rate_basis TEXT,
          override_rating_inputs TEXT,
          wording_refs TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      console.log('✅ Created sub_lobs table');
      
      await client.execute(`
        CREATE INDEX unique_lob_sub_lob ON sub_lobs(lob_id, code);
      `);
      console.log('✅ Created index');
    } else {
      console.log('✅ sub_lobs table exists');
    }

    // Check current structure
    const tableInfo = await client.execute('PRAGMA table_info(sub_lobs);');
    const existingColumns = tableInfo.rows.map(row => row.name);

    console.log('\n📋 Current columns:', existingColumns.join(', '));

    // Define required columns
    const requiredColumns = [
      { name: 'lob_id', def: 'INTEGER NOT NULL' },
      { name: 'name', def: 'TEXT NOT NULL' },
      { name: 'code', def: 'TEXT NOT NULL' },
      { name: 'description', def: 'TEXT' },
      { name: 'status', def: 'TEXT NOT NULL DEFAULT "active"' },
      { name: 'override_brokerage_pct', def: 'REAL' },
      { name: 'override_vat_pct', def: 'REAL' },
      { name: 'override_min_premium', def: 'REAL' },
      { name: 'override_rate_basis', def: 'TEXT' },
      { name: 'override_rating_inputs', def: 'TEXT' },
      { name: 'wording_refs', def: 'TEXT' },
      { name: 'created_at', def: 'TEXT NOT NULL' },
      { name: 'updated_at', def: 'TEXT NOT NULL' }
    ];

    // Add missing columns
    let added = 0;
    for (const col of requiredColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`\n  ➕ Adding column: ${col.name}...`);
        await client.execute(`ALTER TABLE sub_lobs ADD COLUMN ${col.name} ${col.def};`);
        console.log(`  ✅ Added ${col.name}`);
        added++;
      }
    }

    if (added === 0) {
      console.log('\n✅ All required columns already exist');
    } else {
      console.log(`\n✅ Added ${added} missing columns`);
    }

    // Show final structure
    const updatedTableInfo = await client.execute('PRAGMA table_info(sub_lobs);');
    console.log('\n📋 Final sub_lobs table structure:');
    updatedTableInfo.rows.forEach(row => {
      const nullability = row.notnull ? 'NOT NULL' : 'NULL';
      const defaultVal = row.dflt_value ? `DEFAULT ${row.dflt_value}` : '';
      console.log(`   ${row.name} (${row.type}) ${nullability} ${defaultVal}`.trim());
    });

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.close();
  }
}

fixSubLobsTable();
