const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyCommissionMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('📦 Reading commission migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/0009_add_commission_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying commission system migration to database...');
    
    // Split by semicolon and execute each statement sequentially
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Found ${statements.length} statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.execute(statement + ';');
        console.log(`✅ [${i + 1}/${statements.length}] Executed: ${statement.substring(0, 60)}...`);
      } catch (error) {
        console.error(`❌ [${i + 1}/${statements.length}] Failed:`, statement.substring(0, 100));
        throw error;
      }
    }

    console.log('✅ Commission system migration applied successfully!');
    console.log('📊 Created tables: commission_structures, commissions, commission_statements');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyCommissionMigration();
