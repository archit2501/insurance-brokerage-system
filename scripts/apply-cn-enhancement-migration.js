const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyCreditNoteEnhancementMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('📦 Reading credit note enhancement migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/0010_enhance_credit_note_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying credit note enhancements to database...');
    
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

    console.log('✅ Credit note enhancement migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

applyCreditNoteEnhancementMigration();
