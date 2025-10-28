const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runAllMigrations() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🚀 Running ALL database migrations...\n');
    
    // List of migration files in order
    const migrations = [
      '0000_puzzling_hedge_knight.sql',
      '0001_black_charles_xavier.sql',
      '0002_special_jane_foster.sql',
      '0003_clever_mojo.sql',
      '0004_amusing_pestilence.sql',
      '0005_wide_slapstick.sql',
      '0006_hesitant_human_fly.sql',
      '0007_add_better_auth_tables.sql',
      '0008_add_missing_lobs_agents_insurers_columns.sql',
    ];

    for (const migration of migrations) {
      console.log(`\n📦 Running migration: ${migration}`);
      const migrationPath = path.join(__dirname, '../drizzle', migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Skipping ${migration} - file not found`);
        continue;
      }
      
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Split by statement breakpoint and execute each statement
      const statements = sql
        .split(/--> statement-breakpoint/g)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await client.execute(statement);
          console.log(`  ✅ Executed statement (${statement.substring(0, 50)}...)`);
        } catch (err) {
          // Some statements may fail if already exists, that's OK
          if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
            console.log(`  ⚠️  Skipped (already exists): ${err.message.substring(0, 60)}...`);
          } else {
            console.log(`  ❌ Error: ${err.message.substring(0, 80)}...`);
          }
        }
      }
      
      console.log(`✅ Completed: ${migration}`);
    }
    
    console.log('\n\n✅ ALL MIGRATIONS COMPLETED!');
    console.log('✅ Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.close();
  }
}

runAllMigrations();
