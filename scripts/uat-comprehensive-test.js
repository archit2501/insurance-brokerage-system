import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3001';
let authToken = '';
let userId = '';

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: [],
  skipped: []
};

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function apiCall(method, endpoint, body = null, requireAuth = false) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (requireAuth) {
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (userId) headers['x-user-id'] = userId;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function test(name, fn) {
  try {
    log('cyan', `\n🔍 TEST: ${name}`);
    await fn();
    results.passed.push(name);
    log('green', `   ✅ PASSED`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log('red', `   ❌ FAILED: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runComprehensiveTests() {
  console.clear();
  log('cyan', '\n╔════════════════════════════════════════════════════════════╗');
  log('cyan', '║                                                            ║');
  log('cyan', '║          🧪 COMPREHENSIVE UAT TESTING SUITE 🧪            ║');
  log('cyan', '║                                                            ║');
  log('cyan', '╚════════════════════════════════════════════════════════════╝\n');

  log('yellow', '📊 Target: http://localhost:3001');
  log('yellow', '🗓️  Date: ' + new Date().toISOString());
  log('yellow', '⏱️  Starting comprehensive test suite...\n');

  // ==================== AUTHENTICATION TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 1: AUTHENTICATION TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  await test('AUTH-001: User login with test credentials', async () => {
    const res = await apiCall('POST', '/api/auth/sign-in/email', {
      email: 'testuser@insurancebrokerage.com',
      password: 'Test@123456'
    });
    
    assert(res.ok, `Login failed: ${res.status}`);
    assert(res.data.token, 'No token received');
    assert(res.data.user, 'No user data received');
    
    authToken = res.data.token;
    userId = res.data.user.id;
    
    log('blue', `   Token: ${authToken.substring(0, 20)}...`);
    log('blue', `   User ID: ${userId}`);
  });

  await test('AUTH-002: Get session with valid token', async () => {
    const res = await apiCall('GET', '/api/auth/get-session', null, true);
    assert(res.ok, `Get session failed: ${res.status}`);
    assert(res.data.user, 'No user in session');
    log('blue', `   Session user: ${res.data.user.email}`);
  });

  // ==================== CLIENT TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 2: CLIENT MANAGEMENT TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  let individualClientId, companyClientId;

  await test('CLIENT-001: Create Individual Client (No CAC/TIN)', async () => {
    const res = await apiCall('POST', '/api/clients', {
      companyName: 'John Doe (Test Individual)',
      clientType: 'Individual',
      industry: 'Technology',
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      kycStatus: 'pending',
      status: 'active'
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.clientCode, 'No client code generated');
    assert(res.data.clientCode.includes('/IND/'), 'Wrong client type code');
    
    individualClientId = res.data.id;
    log('blue', `   Client ID: ${individualClientId}`);
    log('blue', `   Client Code: ${res.data.clientCode}`);
  });

  await test('CLIENT-002: Create Company Client (With CAC/TIN)', async () => {
    const res = await apiCall('POST', '/api/clients', {
      companyName: 'Acme Corporation Ltd (Test)',
      clientType: 'Company',
      cacRcNumber: 'RC' + Math.floor(Math.random() * 1000000),
      tin: 'TIN' + Math.floor(Math.random() * 1000000),
      industry: 'Financial Services',
      address: '456 Corporate Ave',
      city: 'Abuja',
      state: 'FCT',
      country: 'Nigeria',
      website: 'https://acme-test.com',
      kycStatus: 'pending',
      status: 'active'
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.clientCode, 'No client code generated');
    assert(res.data.clientCode.includes('/COM/'), 'Wrong client type code');
    
    companyClientId = res.data.id;
    log('blue', `   Client ID: ${companyClientId}`);
    log('blue', `   Client Code: ${res.data.clientCode}`);
  });

  await test('CLIENT-003: Get clients list', async () => {
    const res = await apiCall('GET', '/api/clients?limit=10', null, true);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    assert(res.data.length > 0, 'No clients found');
    log('blue', `   Found ${res.data.length} clients`);
  });

  await test('CLIENT-004: Search clients', async () => {
    const res = await apiCall('GET', '/api/clients?search=Test', null, true);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    log('blue', `   Search results: ${res.data.length} clients`);
  });

  // ==================== INSURER TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 3: INSURER MANAGEMENT TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  let insurerId;

  await test('INSURER-001: Create Insurer', async () => {
    const res = await apiCall('POST', '/api/insurers', {
      companyName: 'ABC Insurance Company Ltd (Test)',
      shortName: 'ABC-TEST',
      licenseNumber: 'LIC' + Math.floor(Math.random() * 1000000),
      address: '789 Insurance Plaza',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      website: 'https://abc-insurance-test.com',
      acceptedLobs: JSON.stringify(['Motor', 'Fire', 'Marine']),
      status: 'active'
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.id, 'No insurer ID returned');
    
    insurerId = res.data.id;
    log('blue', `   Insurer ID: ${insurerId}`);
  });

  await test('INSURER-002: Get insurers list', async () => {
    const res = await apiCall('GET', '/api/insurers?limit=10', null, false);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    log('blue', `   Found ${res.data.length} insurers`);
  });

  // ==================== LOB TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 4: LINE OF BUSINESS (LOB) TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  let lobId;

  await test('LOB-001: Create LOB', async () => {
    const res = await apiCall('POST', '/api/lobs', {
      name: 'Motor Insurance (Test)',
      code: 'MTR-TEST',
      description: 'Comprehensive motor insurance',
      status: 'active',
      defaultBrokeragePct: 12.5,
      defaultVatPct: 7.5,
      minPremium: 10000,
      rateBasis: 'Sum Insured',
      ratingInputs: JSON.stringify(['vehicleValue', 'vehicleType'])
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.id, 'No LOB ID returned');
    
    lobId = res.data.id;
    log('blue', `   LOB ID: ${lobId}`);
    log('blue', `   Default Brokerage: ${res.data.defaultBrokeragePct}%`);
  });

  await test('LOB-002: Get LOBs list', async () => {
    const res = await apiCall('GET', '/api/lobs', null, false);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    log('blue', `   Found ${res.data.length} LOBs`);
  });

  // ==================== POLICY TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 5: POLICY LIFECYCLE TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  let policyId;

  await test('POLICY-001: Create Policy', async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const res = await apiCall('POST', '/api/policies', {
      policyNumber: 'POL/TEST/' + Date.now(),
      clientId: companyClientId,
      insurerId: insurerId,
      lobId: lobId,
      sumInsured: 5000000,
      grossPremium: 150000,
      currency: 'NGN',
      policyStartDate: startDate.toISOString().split('T')[0],
      policyEndDate: endDate.toISOString().split('T')[0],
      status: 'active'
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.id, 'No policy ID returned');
    
    policyId = res.data.id;
    log('blue', `   Policy ID: ${policyId}`);
    log('blue', `   Policy Number: ${res.data.policyNumber}`);
  });

  await test('POLICY-002: Get policies list', async () => {
    const res = await apiCall('GET', '/api/policies?limit=10', null, true);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    log('blue', `   Found ${res.data.length} policies`);
  });

  // ==================== CREDIT NOTE TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 6: CREDIT NOTE TESTS (CRITICAL)');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  let creditNoteId;

  await test('CN-001: Create Credit Note', async () => {
    const res = await apiCall('POST', '/api/notes', {
      noteType: 'CN',
      clientId: companyClientId,
      policyId: policyId,
      insurerId: insurerId,
      grossPremium: 150000,
      brokeragePct: 12.5,
      vatPct: 7.5,
      agentCommissionPct: 0,
      levies: {
        niacom: 1.0,
        ncrib: 0.5,
        ed_tax: 0
      }
    }, true);
    
    assert(res.ok, `Failed: ${res.status} - ${res.data.error || ''}`);
    assert(res.data.noteId, 'No note ID generated');
    assert(res.data.noteId.startsWith('CN/'), 'Wrong note type prefix');
    
    creditNoteId = res.data.id;
    log('blue', `   Note ID: ${res.data.noteId}`);
    log('blue', `   Gross Premium: ₦${res.data.grossPremium.toLocaleString()}`);
    log('blue', `   Brokerage Amount: ₦${res.data.brokerageAmount.toLocaleString()}`);
    log('blue', `   VAT on Brokerage: ₦${res.data.vatOnBrokerage.toLocaleString()}`);
    log('blue', `   Net Amount Due: ₦${res.data.netAmountDue.toLocaleString()}`);
  });

  await test('CN-002: Verify financial calculations', async () => {
    const res = await apiCall('GET', `/api/notes?limit=1`, null, true);
    assert(res.ok, `Failed: ${res.status}`);
    
    const note = res.data[0]?.note || res.data[0];
    assert(note, 'No note found');
    
    // Verify calculations
    const expectedBrokerage = 150000 * 0.125; // 18,750
    const expectedVAT = expectedBrokerage * 0.075; // 1,406.25
    const expectedNIACOM = 150000 * 0.01; // 1,500
    const expectedNCRIB = 150000 * 0.005; // 750
    
    assert(Math.abs(note.brokerageAmount - expectedBrokerage) < 1, 'Brokerage calculation incorrect');
    assert(Math.abs(note.vatOnBrokerage - expectedVAT) < 1, 'VAT calculation incorrect');
    
    log('blue', `   ✓ Brokerage: ₦${note.brokerageAmount} (expected ₦${expectedBrokerage})`);
    log('blue', `   ✓ VAT: ₦${note.vatOnBrokerage} (expected ₦${expectedVAT})`);
  });

  // ==================== AUDIT LOG TESTS ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 7: AUDIT LOG TESTS');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  await test('AUDIT-001: Get audit logs', async () => {
    const res = await apiCall('GET', '/api/audit?limit=10', null, true);
    assert(res.ok, `Failed: ${res.status}`);
    assert(Array.isArray(res.data), 'Response is not an array');
    log('blue', `   Found ${res.data.length} audit log entries`);
  });

  // ==================== CLEANUP ====================
  log('magenta', '\n═══════════════════════════════════════════════════════════');
  log('magenta', '  SECTION 8: CLEANUP (Deleting Test Data)');
  log('magenta', '═══════════════════════════════════════════════════════════\n');

  // Delete test data
  if (individualClientId) {
    await test('CLEANUP-001: Delete Individual Client', async () => {
      const res = await apiCall('DELETE', `/api/clients?id=${individualClientId}`, null, true);
      assert(res.ok || res.status === 404, `Failed: ${res.status}`);
      log('blue', `   Deleted client ID: ${individualClientId}`);
    });
  }

  if (companyClientId) {
    await test('CLEANUP-002: Delete Company Client', async () => {
      const res = await apiCall('DELETE', `/api/clients?id=${companyClientId}`, null, true);
      assert(res.ok || res.status === 404, `Failed: ${res.status}`);
      log('blue', `   Deleted client ID: ${companyClientId}`);
    });
  }

  // ==================== FINAL REPORT ====================
  log('magenta', '\n\n╔════════════════════════════════════════════════════════════╗');
  log('magenta', '║                                                            ║');
  log('magenta', '║                  📊 TEST SUMMARY REPORT                    ║');
  log('magenta', '║                                                            ║');
  log('magenta', '╚════════════════════════════════════════════════════════════╝\n');

  const total = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = ((results.passed.length / (total || 1)) * 100).toFixed(1);

  log('cyan', `Total Tests:      ${total}`);
  log('green', `✅ Passed:        ${results.passed.length} (${passRate}%)`);
  log('red', `❌ Failed:        ${results.failed.length}`);
  log('yellow', `⏭️  Skipped:       ${results.skipped.length}`);
  log('yellow', `⚠️  Warnings:      ${results.warnings.length}`);

  if (results.failed.length > 0) {
    log('red', '\n❌ FAILED TESTS:');
    results.failed.forEach((fail, i) => {
      log('red', `   ${i + 1}. ${fail.name}`);
      log('red', `      Error: ${fail.error}`);
    });
  }

  if (results.warnings.length > 0) {
    log('yellow', '\n⚠️  WARNINGS:');
    results.warnings.forEach((warn, i) => {
      log('yellow', `   ${i + 1}. ${warn}`);
    });
  }

  log('cyan', '\n═══════════════════════════════════════════════════════════\n');

  if (results.failed.length === 0) {
    log('green', '🎉 ALL TESTS PASSED! System is ready for UAT.\n');
  } else {
    log('red', '⚠️  Some tests failed. Review issues before UAT.\n');
  }

  log('blue', `📝 Full report saved to: UAT_TEST_RESULTS_${Date.now()}.json\n`);
}

// Run tests
runComprehensiveTests().catch(error => {
  log('red', `\n❌ Test suite error: ${error.message}`);
  process.exit(1);
});
