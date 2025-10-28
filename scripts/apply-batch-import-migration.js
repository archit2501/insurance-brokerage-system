const { createClient } = require('@libsql/client');
const fs = require('fs');
require('dotenv').config();

async function applyBatchImportMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('📦 Applying batch import migration...');
    const sql = fs.readFileSync('./drizzle/0011_add_batch_import.sql', 'utf-8');
    
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    console.log(`📝 Found ${statements.length} statements`);
    
    for (let i = 0; i < statements.length; i++) {
      await client.execute(statements[i] + ';');
      console.log(`✅ [${i + 1}/${statements.length}]`);
    }

    console.log('✅ Batch import tables created successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyBatchImportMigration();
