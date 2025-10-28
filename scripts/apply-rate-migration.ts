import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

async function applyMigration() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    console.log('Applying migration: Add rate field to policies table...');

    // Apply the migration
    await client.execute('ALTER TABLE policies ADD COLUMN rate REAL');

    console.log('✓ Migration applied successfully!');
    console.log('The "rate" column has been added to the policies table.');
  } catch (error: any) {
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('✓ Migration already applied - rate column already exists.');
    } else {
      console.error('✗ Migration failed:', error);
      throw error;
    }
  } finally {
    client.close();
  }
}

applyMigration()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
