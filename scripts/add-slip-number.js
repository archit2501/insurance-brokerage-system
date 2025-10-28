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

async function addSlipNumber() {
  try {
    console.log('📦 Adding slip_number column to policies table...\n');
    
    await db.execute('ALTER TABLE policies ADD COLUMN slip_number TEXT');
    console.log('✅ Added slip_number column');
    
    await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS policies_slip_number_unique ON policies(slip_number)');
    console.log('✅ Created unique index on slip_number');
    
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (error) {
    if (error.message && error.message.includes('duplicate column')) {
      console.log('✅ Column already exists');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

addSlipNumber();
