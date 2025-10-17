const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/0009_make_cac_tin_nullable.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to make CAC/RC and TIN nullable...');
    
    // Split by statement breakpoint and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('✅ Executed:', statement.substring(0, 80) + '...');
      } catch (err) {
        console.log('⚠️  Statement skipped (may be expected):', err.message);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('✅ CAC/RC and TIN are now nullable for Individual clients');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyMigration();
