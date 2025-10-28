// Run migration 0013 - Add Property Items and Co-Insurance Shares
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const migrationPath = path.join(__dirname, '..', 'drizzle', '0013_add_broking_slip_property_items.sql');

console.log('Running migration 0013...');
console.log('Migration file:', migrationPath);

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migration = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  try {
    // Split by semicolon and execute each statement
    const statements = migration.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await client.execute(statement);
      }
    }

    console.log('✓ Migration 0013 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
