const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyBrokingSlipMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('📦 Reading broking slip migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/0009_add_broking_slip_support.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying broking slip migration to database...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('✅ Executed:', statement.substring(0, 80) + '...');
      } catch (error) {
        // Column might already exist, continue
        if (error.message && error.message.includes('duplicate column')) {
          console.log('ℹ️  Column already exists, skipping:', statement.substring(0, 80) + '...');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Broking slip migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyBrokingSlipMigration();
