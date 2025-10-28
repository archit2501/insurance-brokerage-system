import { createClient } from '@libsql/client';
import { config } from 'dotenv';

// Load environment variables
config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addAgentCodeColumn() {
  console.log('🔧 Adding agent_code column to agents table...\n');

  try {
    // Check if column already exists
    const tableInfo = await client.execute(`PRAGMA table_info(agents)`);
    const hasAgentCode = tableInfo.rows.some((row) => row.name === 'agent_code');

    if (hasAgentCode) {
      console.log('✅ Column agent_code already exists!');
      return;
    }

    // Add the agent_code column
    console.log('Adding agent_code column...');
    await client.execute(`
      ALTER TABLE agents 
      ADD COLUMN agent_code TEXT;
    `);
    console.log('✅ Added agent_code column');

    // Create unique index on agent_code
    console.log('Creating unique index on agent_code...');
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS agents_agent_code_unique 
      ON agents(agent_code);
    `);
    console.log('✅ Created unique index');

    // Verify the column was added
    const verify = await client.execute(`PRAGMA table_info(agents)`);
    const agentCodeColumn = verify.rows.find((row) => row.name === 'agent_code');
    
    if (agentCodeColumn) {
      console.log('\n✅ SUCCESS! agent_code column added successfully');
      console.log('Column details:', agentCodeColumn);
    } else {
      console.log('\n❌ ERROR: Column was not added');
    }

    // Show current table structure
    console.log('\n📋 Current agents table structure:');
    verify.rows.forEach((row) => {
      console.log(`   ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : 'NULL'} ${row.dflt_value ? 'DEFAULT ' + row.dflt_value : ''}`);
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.close();
  }
}

addAgentCodeColumn()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
