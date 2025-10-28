import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createSequencesTables() {
  console.log('\n🔧 Creating sequences tables...\n');

  try {
    // Create entity_sequences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS entity_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        entity TEXT NOT NULL,
        year INTEGER NOT NULL,
        last_seq INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✅ Created entity_sequences table');

    // Create index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS unique_entity_year ON entity_sequences(entity, year)
    `);
    console.log('✅ Created unique_entity_year index');

    // Create endorsement_sequences table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS endorsement_sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        entity TEXT NOT NULL,
        year INTEGER NOT NULL,
        last_seq INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✅ Created endorsement_sequences table');

    // Create index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS unique_endorsement_entity_year ON endorsement_sequences(entity, year)
    `);
    console.log('✅ Created unique_endorsement_entity_year index');

    // Verify tables exist
    const result = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('entity_sequences', 'endorsement_sequences')
      ORDER BY name
    `);
    
    console.log('\n📊 Verified tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.name}`);
    });

    console.log('\n✅ ALL SEQUENCE TABLES CREATED!');
    console.log('\n🎉 You can now create clients with auto-generated codes!\n');

  } catch (error) {
    console.error('\n❌ Error creating tables:', error);
    throw error;
  }
}

createSequencesTables().catch(console.error);
