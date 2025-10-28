import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createEndorsementsTable() {
  console.log('\n🔧 Creating endorsements table...\n');

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS endorsements (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        policy_id INTEGER,
        endorsement_number TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        description TEXT,
        sum_insured_delta REAL DEFAULT 0,
        gross_premium_delta REAL DEFAULT 0,
        brokerage_pct REAL,
        vat_pct REAL,
        levies TEXT,
        net_amount_due REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'Draft' NOT NULL,
        pdf_path TEXT,
        sha256_hash TEXT,
        prepared_by INTEGER,
        authorized_by INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (policy_id) REFERENCES policies(id),
        FOREIGN KEY (prepared_by) REFERENCES user(id),
        FOREIGN KEY (authorized_by) REFERENCES user(id)
      )
    `);
    console.log('✅ Created endorsements table');

    await db.execute(`
      CREATE INDEX IF NOT EXISTS endorsements_policy_id_idx ON endorsements(policy_id)
    `);
    console.log('✅ Created index on policy_id');

    console.log('\n✅ Endorsements table ready!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createEndorsementsTable().catch(console.error);
