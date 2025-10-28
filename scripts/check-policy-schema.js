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

async function checkSchema() {
  try {
    // Get table schema
    const result = await db.execute("PRAGMA table_info(policies)");
    
    console.log('\n📋 Policies Table Columns:\n');
    console.log('Name'.padEnd(30), 'Type'.padEnd(15), 'NotNull');
    console.log('-'.repeat(60));
    
    for (const row of result.rows) {
      console.log(
        String(row.name).padEnd(30),
        String(row.type).padEnd(15),
        row.notnull ? 'YES' : 'NO'
      );
    }
    
    console.log(`\nTotal columns: ${result.rows.length}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
