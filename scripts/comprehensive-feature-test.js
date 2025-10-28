import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function comprehensiveFeatureTest() {
  console.log('\n========================================');
  console.log('   COMPREHENSIVE FEATURE TEST');
  console.log('========================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // TEST 1: Database Connection
    console.log('🔍 TEST 1: Database Connection');
    try {
      await db.execute('SELECT 1');
      console.log('   ✅ Database connection successful\n');
      results.passed.push('Database Connection');
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message, '\n');
      results.failed.push('Database Connection');
    }

    // TEST 2: All Required Tables Exist
    console.log('🔍 TEST 2: Required Tables');
    const tables = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    const tableNames = tables.rows.map(r => r.name);
    
    const requiredTables = {
      'Core Masters': ['clients', 'insurers', 'agents', 'lobs', 'sub_lobs'],
      'Financial': ['bank_accounts', 'policies', 'notes', 'cn_insurer_shares'],
      'Supporting': ['contacts', 'kyc_files', 'agent_contacts', 'agent_kyc_files', 'insurer_emails'],
      'Sequences': ['entity_sequences', 'endorsement_sequences', 'note_sequences'],
      'Workflow': ['rfqs', 'rfq_insurers', 'endorsements', 'reminders', 'dispatch_logs'],
      'System': ['audit_logs', 'user', 'session', 'account', 'verification']
    };

    for (const [category, tables] of Object.entries(requiredTables)) {
      console.log(`   ${category}:`);
      for (const table of tables) {
        if (tableNames.includes(table)) {
          console.log(`      ✅ ${table}`);
        } else {
          console.log(`      ❌ ${table} (MISSING)`);
          results.failed.push(`Table: ${table}`);
        }
      }
    }
    console.log('');

    // TEST 3: Clients Table Schema
    console.log('🔍 TEST 3: Clients Table Schema');
    const clientSchema = await db.execute('PRAGMA table_info(clients)');
    const columns = clientSchema.rows.map(r => r.name);
    
    const requiredColumns = [
      'id', 'client_code', 'company_name', 'client_type', 
      'cac_rc_number', 'tin', 'industry', 'address', 'city', 
      'state', 'country', 'website', 'kyc_status', 'status',
      'created_by', 'created_at', 'updated_at'
    ];

    let allColumnsPresent = true;
    for (const col of requiredColumns) {
      if (columns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} (MISSING)`);
        allColumnsPresent = false;
        results.failed.push(`Column: clients.${col}`);
      }
    }

    // Check nullable constraints
    const cacCol = clientSchema.rows.find(r => r.name === 'cac_rc_number');
    const tinCol = clientSchema.rows.find(r => r.name === 'tin');
    
    if (cacCol && cacCol.notnull === 0) {
      console.log('   ✅ cac_rc_number is NULLABLE (correct for Individual clients)');
    } else {
      console.log('   ⚠️  cac_rc_number is NOT NULL (will fail for Individual clients)');
      results.warnings.push('CAC/RC should be nullable');
    }

    if (tinCol && tinCol.notnull === 0) {
      console.log('   ✅ tin is NULLABLE (correct for Individual clients)');
    } else {
      console.log('   ⚠️  tin is NOT NULL (will fail for Individual clients)');
      results.warnings.push('TIN should be nullable');
    }
    console.log('');

    if (allColumnsPresent) {
      results.passed.push('Clients Table Schema');
    }

    // TEST 4: Test Client Creation (Individual)
    console.log('🔍 TEST 4: Create Individual Client (No CAC/TIN)');
    try {
      const testClient = await db.execute({
        sql: `INSERT INTO clients (company_name, client_type, client_code, industry, 
              address, city, state, country, kyc_status, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING id`,
        args: [
          'Test Individual Client',
          'Individual',
          'TEST/CL/2025/IND/00001',
          'Technology',
          '123 Test Street',
          'Lagos',
          'Lagos',
          'Nigeria',
          'pending',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      });
      const clientId = testClient.rows[0].id;
      console.log(`   ✅ Individual client created successfully (ID: ${clientId})`);
      
      // Clean up
      await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [clientId] });
      console.log('   ✅ Test data cleaned up\n');
      results.passed.push('Create Individual Client');
    } catch (error) {
      console.log('   ❌ Failed to create individual client:', error.message, '\n');
      results.failed.push('Create Individual Client');
    }

    // TEST 5: Test Client Creation (Company)
    console.log('🔍 TEST 5: Create Company Client (With CAC/TIN)');
    try {
      const testClient = await db.execute({
        sql: `INSERT INTO clients (company_name, client_type, client_code, cac_rc_number, tin,
              industry, address, city, state, country, kyc_status, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING id`,
        args: [
          'Test Company Ltd',
          'Company',
          'TEST/CL/2025/COM/00001',
          'RC1234567',
          'TIN9876543',
          'Financial Services',
          '456 Corporate Ave',
          'Abuja',
          'FCT',
          'Nigeria',
          'pending',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      });
      const clientId = testClient.rows[0].id;
      console.log(`   ✅ Company client created successfully (ID: ${clientId})`);
      
      // Clean up
      await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [clientId] });
      console.log('   ✅ Test data cleaned up\n');
      results.passed.push('Create Company Client');
    } catch (error) {
      console.log('   ❌ Failed to create company client:', error.message, '\n');
      results.failed.push('Create Company Client');
    }

    // TEST 6: Entity Sequences
    console.log('🔍 TEST 6: Entity Sequences Table');
    try {
      const seq = await db.execute(`
        SELECT * FROM entity_sequences WHERE entity = 'CLIENT' AND year = 2025
      `);
      console.log(`   ✅ Entity sequences table accessible (${seq.rows.length} records for CLIENT 2025)`);
      results.passed.push('Entity Sequences');
    } catch (error) {
      console.log('   ❌ Entity sequences table issue:', error.message);
      results.failed.push('Entity Sequences');
    }
    console.log('');

    // TEST 7: Other Key Tables
    console.log('🔍 TEST 7: Other Key Tables Access');
    const testTables = [
      'insurers', 'agents', 'lobs', 'bank_accounts', 
      'policies', 'notes', 'rfqs'
    ];

    for (const table of testTables) {
      try {
        await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table} table accessible`);
      } catch (error) {
        console.log(`   ❌ ${table} table issue:`, error.message);
        results.failed.push(`Table Access: ${table}`);
      }
    }
    console.log('');

    // TEST 8: Indexes
    console.log('🔍 TEST 8: Critical Indexes');
    const indexes = await db.execute(`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type='index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);
    
    console.log(`   Found ${indexes.rows.length} custom indexes`);
    const criticalIndexes = [
      'clients_client_code_unique',
      'unique_entity_year',
      'unique_note_type_year_seq'
    ];

    const indexNames = indexes.rows.map(r => r.name);
    for (const idx of criticalIndexes) {
      if (indexNames.includes(idx)) {
        console.log(`   ✅ ${idx}`);
      } else {
        console.log(`   ⚠️  ${idx} (missing or different name)`);
        results.warnings.push(`Index: ${idx}`);
      }
    }
    console.log('');

    // SUMMARY
    console.log('========================================');
    console.log('   TEST SUMMARY');
    console.log('========================================\n');
    
    console.log(`✅ PASSED: ${results.passed.length} tests`);
    results.passed.forEach(t => console.log(`   • ${t}`));
    
    if (results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
      results.warnings.forEach(w => console.log(`   • ${w}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ FAILED: ${results.failed.length} tests`);
      results.failed.forEach(f => console.log(`   • ${f}`));
    }

    console.log('\n========================================');
    if (results.failed.length === 0) {
      console.log('   🎉 ALL CRITICAL TESTS PASSED!');
      console.log('   Database is ready for use!');
    } else {
      console.log('   ⚠️  Some tests failed - review above');
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    throw error;
  }
}

comprehensiveFeatureTest().catch(console.error);
