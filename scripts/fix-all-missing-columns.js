import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addColumnIfMissing(tableName, columnName, columnDef) {
  try {
    const tableInfo = await client.execute(`PRAGMA table_info(${tableName});`);
    const columnExists = tableInfo.rows.some(row => row.name === columnName);

    if (columnExists) {
      console.log(`  ✅ ${columnName} already exists`);
      return false;
    }

    console.log(`  ➕ Adding ${columnName}...`);
    await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
    console.log(`  ✅ Added ${columnName}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error adding ${columnName}:`, error.message);
    return false;
  }
}

async function createIndexIfMissing(indexName, tableName, columns) {
  try {
    console.log(`  🔧 Creating index ${indexName}...`);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columns});`);
    console.log(`  ✅ Created index ${indexName}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error creating index ${indexName}:`, error.message);
    return false;
  }
}

async function fixAllMissingColumns() {
  console.log('🔧 Fixing ALL missing columns across all tables...\n');

  let totalAdded = 0;

  // AGENTS TABLE
  console.log('📋 AGENTS TABLE:');
  if (await addColumnIfMissing('agents', 'agent_code', 'TEXT')) {
    await createIndexIfMissing('agents_agent_code_unique', 'agents', 'agent_code');
    totalAdded++;
  }

  // INSURERS TABLE
  console.log('\n📋 INSURERS TABLE:');
  if (await addColumnIfMissing('insurers', 'insurer_code', 'TEXT')) {
    await createIndexIfMissing('insurers_insurer_code_unique', 'insurers', 'insurer_code');
    totalAdded++;
  }
  if (await addColumnIfMissing('insurers', 'license_expiry', 'TEXT NOT NULL DEFAULT "2099-12-31"')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('insurers', 'special_lobs', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('insurers', 'created_by', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('insurers', 'updated_by', 'INTEGER')) {
    totalAdded++;
  }

  // CLIENTS TABLE
  console.log('\n📋 CLIENTS TABLE:');
  if (await addColumnIfMissing('clients', 'client_code', 'TEXT')) {
    await createIndexIfMissing('clients_client_code_unique', 'clients', 'client_code');
    totalAdded++;
  }
  if (await addColumnIfMissing('clients', 'created_by', 'INTEGER')) {
    totalAdded++;
  }

  // LOBS TABLE
  console.log('\n📋 LOBS TABLE:');
  if (await addColumnIfMissing('lobs', 'code', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'description', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'default_brokerage_pct', 'REAL NOT NULL DEFAULT 0')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'default_vat_pct', 'REAL NOT NULL DEFAULT 7.5')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'rate_basis', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'rating_inputs', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'min_premium', 'REAL NOT NULL DEFAULT 0')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('lobs', 'wording_refs', 'TEXT')) {
    totalAdded++;
  }

  // BANKS TABLE
  console.log('\n📋 BANKS TABLE:');
  if (await addColumnIfMissing('banks', 'bank_code', 'TEXT')) {
    await createIndexIfMissing('banks_bank_code_unique', 'banks', 'bank_code');
    totalAdded++;
  }

  // POLICIES TABLE
  console.log('\n📋 POLICIES TABLE:');
  if (await addColumnIfMissing('policies', 'policy_number', 'TEXT')) {
    await createIndexIfMissing('policies_policy_number_unique', 'policies', 'policy_number');
    totalAdded++;
  }
  if (await addColumnIfMissing('policies', 'rfq_id', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('policies', 'sub_lob_id', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('policies', 'confirmation_date', 'TEXT')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('policies', 'created_by', 'INTEGER')) {
    totalAdded++;
  }

  // RFQs TABLE
  console.log('\n📋 RFQS TABLE:');
  if (await addColumnIfMissing('rfqs', 'sub_lob_id', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('rfqs', 'expected_sum_insured', 'REAL')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('rfqs', 'expected_gross_premium', 'REAL')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('rfqs', 'target_rate_pct', 'REAL')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('rfqs', 'selected_insurer_id', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('rfqs', 'created_by', 'INTEGER')) {
    totalAdded++;
  }

  // ENDORSEMENTS TABLE
  console.log('\n📋 ENDORSEMENTS TABLE:');
  if (await addColumnIfMissing('endorsements', 'endorsement_number', 'TEXT')) {
    await createIndexIfMissing('endorsements_endorsement_number_unique', 'endorsements', 'endorsement_number');
    totalAdded++;
  }
  if (await addColumnIfMissing('endorsements', 'approved_by', 'INTEGER')) {
    totalAdded++;
  }
  if (await addColumnIfMissing('endorsements', 'approved_at', 'TEXT')) {
    totalAdded++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ COMPLETE! Added ${totalAdded} missing columns`);
  console.log('='.repeat(60));

  // Display summary of all tables
  const tables = ['agents', 'insurers', 'clients', 'lobs', 'banks', 'policies', 'rfqs', 'endorsements'];
  
  console.log('\n📊 TABLE STRUCTURES SUMMARY:\n');
  for (const table of tables) {
    try {
      const tableInfo = await client.execute(`PRAGMA table_info(${table});`);
      console.log(`\n${table.toUpperCase()} (${tableInfo.rows.length} columns):`);
      tableInfo.rows.forEach(row => {
        const nullability = row.notnull ? 'NOT NULL' : 'NULL';
        const defaultVal = row.dflt_value ? `DEFAULT ${row.dflt_value}` : '';
        console.log(`  ${row.name} (${row.type}) ${nullability} ${defaultVal}`.trim());
      });
    } catch (error) {
      console.log(`  ⚠️  Table ${table} might not exist`);
    }
  }

  console.log('\n✅ Script completed successfully!');
}

fixAllMissingColumns()
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
