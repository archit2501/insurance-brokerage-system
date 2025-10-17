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
    const migrationPath = path.join(__dirname, '../drizzle/0007_add_better_auth_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to database...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await client.execute(statement);
      console.log('✅ Executed:', statement.substring(0, 50) + '...');
    }

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyMigration();