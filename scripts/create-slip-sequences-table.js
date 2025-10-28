import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createSlipSequencesTable() {
  try {
    console.log('📦 Creating slip_sequences table...\n');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS slip_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL UNIQUE,
        last_seq INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✅ Created slip_sequences table');
    
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS unique_slip_year ON slip_sequences(year)');
    console.log('✅ Created unique index on year');
    
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSlipSequencesTable();
