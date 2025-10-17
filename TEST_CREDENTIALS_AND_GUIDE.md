# 🔐 TEST CREDENTIALS & SYSTEM ACCESS

## Server Information
- **Local URL:** http://localhost:3000
- **Network URL:** http://10.150.17.53:3000
- **API Base:** http://localhost:3000/api
- **Status:** ✅ Running on Next.js 15.3.5 (Turbopack)

---

## 🔑 Test Account Credentials

### Primary Test Account:
```
Email: testuser@insurancebrokerage.com
Password: Test@123456
Name: UAT Test User
```

### Alternative Test Account:
```
Email: admin@insurancebrokerage.com
Password: Admin@123456
Name: Admin User
```

### Quick Test Account:
```
Email: demo@test.com
Password: Demo@123456
Name: Demo User
```

---

## 🚀 Quick Start Guide

### Step 1: Access the System
1. Open browser: http://localhost:3000
2. You should see the login page
3. Click "Register" if you need to create the account first

### Step 2: Register (First Time Only)
**Registration Endpoint:** `POST /api/auth/sign-up`

```json
{
  "email": "testuser@insurancebrokerage.com",
  "password": "Test@123456",
  "name": "UAT Test User"
}
```

### Step 3: Login
**Login Endpoint:** `POST /api/auth/sign-in`

```json
{
  "email": "testuser@insurancebrokerage.com",
  "password": "Test@123456"
}
```

**Response will contain:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "1",
    "email": "testuser@insurancebrokerage.com",
    "name": "UAT Test User"
  }
}
```

### Step 4: Use Authentication Token
Add these headers to all API requests:
```
Authorization: Bearer <your_token_here>
x-user-id: <user_id>
Content-Type: application/json
```

---

## 📋 Complete Workflow Test

### Test 1: Create Company Client ✅
**Endpoint:** `POST /api/clients`

```json
{
  "companyName": "Acme Manufacturing Ltd",
  "clientType": "Company",
  "cacRcNumber": "RC987654",
  "tin": "87654321",
  "industry": "Manufacturing",
  "address": "123 Industrial Avenue",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "status": "active"
}
```

**Expected Response:**
- `clientCode`: MEIBL/CL/2025/CORP/00001
- `id`: 1

---

### Test 2: Create Insurer ✅
**Endpoint:** `POST /api/insurers`

```json
{
  "companyName": "Premier Insurance Company",
  "shortName": "PIC",
  "licenseNumber": "LIC2025001",
  "licenseExpiry": "2026-12-31",
  "address": "456 Insurance Boulevard",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "status": "active",
  "acceptedLobs": ["MOTOR", "FIRE", "MARINE"],
  "specialLobs": ["AVIATION"]
}
```

**Expected Response:**
- `insurerCode`: MEIBL/IN/2025/00001
- `id`: 1

---

### Test 3: Create Individual Agent ✅
**Endpoint:** `POST /api/agents`

```json
{
  "agentType": "Individual",
  "fullName": "John Agent Smith",
  "email": "agent@insurancebrokerage.com",
  "phone": "+2348012345678",
  "address": "789 Agent Street",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "commissionModel": "flat",
  "commissionRate": 2.5,
  "status": "active"
}
```

**Expected Response:**
- `agentCode`: MEIBL/AG/2025/IND/00001
- `id`: 1

---

### Test 4: Create Bank Account for Client ✅
**Endpoint:** `POST /api/banks`

```json
{
  "ownerType": "Client",
  "ownerId": 1,
  "bankName": "First Bank of Nigeria",
  "branch": "Marina Branch",
  "accountNumber": "0123456789",
  "accountCountry": "NG",
  "currency": "NGN",
  "usageReceivable": true,
  "usagePayable": false,
  "isDefault": true
}
```

**Expected Response:**
- `bankCode`: MEIBL/BK/2025/00001
- `id`: 1

---

### Test 5: Create LOB (Motor Insurance) ✅
**Endpoint:** `POST /api/lobs`

```json
{
  "name": "Motor Insurance",
  "code": "MOTOR",
  "description": "Comprehensive vehicle insurance coverage",
  "defaultBrokeragePct": 10.0,
  "defaultVatPct": 7.5,
  "minPremium": 5000.00,
  "rateBasis": "Sum Insured",
  "status": "active"
}
```

**Expected Response:**
- `id`: 1
- `code`: MOTOR

---

### Test 6: Create Sub-LOB ✅
**Endpoint:** `POST /api/lobs/1/sublobs`

```json
{
  "name": "Comprehensive Motor",
  "code": "MOTOR_COMP",
  "description": "Full coverage including theft, fire, and third party",
  "overrideMinPremium": 7500.00,
  "overrideBrokeragePct": 12.0,
  "status": "active"
}
```

**Expected Response:**
- `id`: 1
- `lobId`: 1

---

### Test 7: Create Policy ✅
**Endpoint:** `POST /api/policies`

```json
{
  "clientId": 1,
  "insurerId": 1,
  "lobId": 1,
  "subLobId": 1,
  "sumInsured": 5000000.00,
  "grossPremium": 75000.00,
  "policyStartDate": "2025-10-17",
  "policyEndDate": "2026-10-16",
  "currency": "NGN",
  "status": "active"
}
```

**Expected Response:**
- `policyNumber`: MEIBL/PL/2025/00001
- `id`: 1

**Validation:**
- Minimum premium check: 75,000 > 7,500 ✅
- Date range valid ✅
- All foreign keys exist ✅

---

### Test 8: Create Credit Note (CN) ✅
**Endpoint:** `POST /api/notes`

```json
{
  "noteType": "CN",
  "clientId": 1,
  "insurerId": 1,
  "policyId": 1,
  "grossPremium": 75000.00,
  "brokeragePct": 12.0,
  "vatPct": 7.5,
  "agentCommissionPct": 2.5,
  "levies": {
    "niacom": 150.00,
    "ncrib": 75.00,
    "ed_tax": 50.00
  },
  "status": "draft"
}
```

**Expected Response:**
- `noteId`: CN/2025/000001
- `id`: 1

**Financial Calculations (Auto):**
```
Gross Premium:      NGN 75,000.00
Brokerage (12%):    NGN  9,000.00
VAT (7.5%):         NGN    675.00
Agent Comm (2.5%):  NGN  1,875.00
Net Brokerage:      NGN  7,125.00
NIACOM Levy:        NGN    150.00
NCRIB Levy:         NGN     75.00
ED Tax:             NGN     50.00
Total Levies:       NGN    275.00
Net Amount Due:     NGN 65,050.00
```

---

### Test 9: Create Debit Note (DN) ✅
**Endpoint:** `POST /api/notes`

```json
{
  "noteType": "DN",
  "clientId": 1,
  "insurerId": 1,
  "policyId": 1,
  "grossPremium": 80000.00,
  "brokeragePct": 12.0,
  "vatPct": 7.5,
  "agentCommissionPct": 2.5,
  "levies": {
    "niacom": 160.00,
    "ncrib": 80.00,
    "ed_tax": 55.00
  },
  "status": "draft"
}
```

**Expected Response:**
- `noteId`: DN/2025/000001
- `id`: 2

---

### Test 10: Create Endorsement ✅
**Endpoint:** `POST /api/endorsements`

```json
{
  "policyId": 1,
  "description": "Increase in sum insured due to vehicle upgrade",
  "sumInsuredDelta": 500000.00,
  "grossPremiumDelta": 7500.00,
  "effectiveDate": "2025-11-01",
  "status": "draft"
}
```

**Expected Response:**
- `endorsementNumber`: END/2025/000001
- `id`: 1

---

## 🧪 Automated Test Script

Save this as `complete-workflow-test.ps1`:

```powershell
# Complete Workflow Test Script
$baseUrl = "http://localhost:3000/api"
$email = "testuser@insurancebrokerage.com"
$password = "Test@123456"

Write-Host "Starting Complete Workflow Test..." -ForegroundColor Cyan

# Step 1: Register/Login
Write-Host "`n1. Authenticating..." -ForegroundColor Yellow
$authBody = @{
    email = $email
    password = $password
    name = "UAT Test User"
} | ConvertTo-Json

try {
    $auth = Invoke-RestMethod -Uri "$baseUrl/auth/sign-up" -Method POST -Body $authBody -ContentType "application/json"
    Write-Host "   Registered new user" -ForegroundColor Green
} catch {
    $loginBody = @{ email = $email; password = $password } | ConvertTo-Json
    $auth = Invoke-RestMethod -Uri "$baseUrl/auth/sign-in" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "   Logged in existing user" -ForegroundColor Green
}

$token = $auth.token
$userId = $auth.user.id
$headers = @{
    "Authorization" = "Bearer $token"
    "x-user-id" = $userId
    "Content-Type" = "application/json"
}

Write-Host "   Token: $token" -ForegroundColor Gray
Write-Host "   User ID: $userId" -ForegroundColor Gray

# Step 2: Create Client
Write-Host "`n2. Creating Client..." -ForegroundColor Yellow
$clientBody = @{
    companyName = "Acme Manufacturing Ltd"
    clientType = "Company"
    cacRcNumber = "RC987654"
    tin = "87654321"
    industry = "Manufacturing"
    address = "123 Industrial Avenue"
    city = "Lagos"
    state = "Lagos"
    country = "Nigeria"
    status = "active"
} | ConvertTo-Json

$client = Invoke-RestMethod -Uri "$baseUrl/clients" -Method POST -Headers $headers -Body $clientBody
Write-Host "   Client Code: $($client.clientCode)" -ForegroundColor Green
Write-Host "   Client ID: $($client.id)" -ForegroundColor Gray

# Step 3: Create Insurer
Write-Host "`n3. Creating Insurer..." -ForegroundColor Yellow
$insurerBody = @{
    companyName = "Premier Insurance Company"
    shortName = "PIC"
    licenseNumber = "LIC2025001"
    licenseExpiry = "2026-12-31"
    address = "456 Insurance Boulevard"
    city = "Lagos"
    state = "Lagos"
    country = "Nigeria"
    status = "active"
} | ConvertTo-Json

$insurer = Invoke-RestMethod -Uri "$baseUrl/insurers" -Method POST -Headers $headers -Body $insurerBody
Write-Host "   Insurer Code: $($insurer.insurerCode)" -ForegroundColor Green
Write-Host "   Insurer ID: $($insurer.id)" -ForegroundColor Gray

# Step 4: Create Agent
Write-Host "`n4. Creating Agent..." -ForegroundColor Yellow
$agentBody = @{
    agentType = "Individual"
    fullName = "John Agent Smith"
    email = "agent@insurancebrokerage.com"
    phone = "+2348012345678"
    address = "789 Agent Street"
    city = "Lagos"
    state = "Lagos"
    country = "Nigeria"
    commissionModel = "flat"
    commissionRate = 2.5
    status = "active"
} | ConvertTo-Json

$agent = Invoke-RestMethod -Uri "$baseUrl/agents" -Method POST -Headers $headers -Body $agentBody
Write-Host "   Agent Code: $($agent.agentCode)" -ForegroundColor Green
Write-Host "   Agent ID: $($agent.id)" -ForegroundColor Gray

# Step 5: Create Bank Account
Write-Host "`n5. Creating Bank Account..." -ForegroundColor Yellow
$bankBody = @{
    ownerType = "Client"
    ownerId = $client.id
    bankName = "First Bank of Nigeria"
    accountNumber = "0123456789"
    accountCountry = "NG"
    currency = "NGN"
    usageReceivable = $true
    usagePayable = $false
    isDefault = $true
} | ConvertTo-Json

$bank = Invoke-RestMethod -Uri "$baseUrl/banks" -Method POST -Headers $headers -Body $bankBody
Write-Host "   Bank Code: $($bank.bankCode)" -ForegroundColor Green
Write-Host "   Bank ID: $($bank.id)" -ForegroundColor Gray

# Step 6: Create LOB
Write-Host "`n6. Creating LOB..." -ForegroundColor Yellow
$lobBody = @{
    name = "Motor Insurance"
    code = "MOTOR"
    description = "Vehicle insurance coverage"
    defaultBrokeragePct = 10.0
    defaultVatPct = 7.5
    minPremium = 5000.00
    status = "active"
} | ConvertTo-Json

$lob = Invoke-RestMethod -Uri "$baseUrl/lobs" -Method POST -Headers $headers -Body $lobBody
Write-Host "   LOB ID: $($lob.id)" -ForegroundColor Green
Write-Host "   LOB Code: $($lob.code)" -ForegroundColor Gray

# Step 7: Create Sub-LOB
Write-Host "`n7. Creating Sub-LOB..." -ForegroundColor Yellow
$subLobBody = @{
    name = "Comprehensive Motor"
    code = "MOTOR_COMP"
    description = "Full coverage"
    overrideMinPremium = 7500.00
    overrideBrokeragePct = 12.0
    status = "active"
} | ConvertTo-Json

$subLob = Invoke-RestMethod -Uri "$baseUrl/lobs/$($lob.id)/sublobs" -Method POST -Headers $headers -Body $subLobBody
Write-Host "   Sub-LOB ID: $($subLob.id)" -ForegroundColor Green

# Step 8: Create Policy
Write-Host "`n8. Creating Policy..." -ForegroundColor Yellow
$policyBody = @{
    clientId = $client.id
    insurerId = $insurer.id
    lobId = $lob.id
    subLobId = $subLob.id
    sumInsured = 5000000.00
    grossPremium = 75000.00
    policyStartDate = "2025-10-17"
    policyEndDate = "2026-10-16"
    currency = "NGN"
    status = "active"
} | ConvertTo-Json

$policy = Invoke-RestMethod -Uri "$baseUrl/policies" -Method POST -Headers $headers -Body $policyBody
Write-Host "   Policy Number: $($policy.policyNumber)" -ForegroundColor Green
Write-Host "   Policy ID: $($policy.id)" -ForegroundColor Gray

# Step 9: Create Credit Note
Write-Host "`n9. Creating Credit Note..." -ForegroundColor Yellow
$cnBody = @{
    noteType = "CN"
    clientId = $client.id
    insurerId = $insurer.id
    policyId = $policy.id
    grossPremium = 75000.00
    brokeragePct = 12.0
    vatPct = 7.5
    agentCommissionPct = 2.5
    levies = @{
        niacom = 150.00
        ncrib = 75.00
        ed_tax = 50.00
    }
    status = "draft"
} | ConvertTo-Json

$cn = Invoke-RestMethod -Uri "$baseUrl/notes" -Method POST -Headers $headers -Body $cnBody
Write-Host "   Note ID: $($cn.noteId)" -ForegroundColor Green
Write-Host "   Net Amount Due: NGN $($cn.netAmountDue)" -ForegroundColor Cyan

# Step 10: Create Debit Note
Write-Host "`n10. Creating Debit Note..." -ForegroundColor Yellow
$dnBody = @{
    noteType = "DN"
    clientId = $client.id
    insurerId = $insurer.id
    policyId = $policy.id
    grossPremium = 80000.00
    brokeragePct = 12.0
    vatPct = 7.5
    agentCommissionPct = 2.5
    levies = @{
        niacom = 160.00
        ncrib = 80.00
        ed_tax = 55.00
    }
    status = "draft"
} | ConvertTo-Json

$dn = Invoke-RestMethod -Uri "$baseUrl/notes" -Method POST -Headers $headers -Body $dnBody
Write-Host "   Note ID: $($dn.noteId)" -ForegroundColor Green
Write-Host "   Net Amount Due: NGN $($dn.netAmountDue)" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nGenerated Codes:" -ForegroundColor Cyan
Write-Host "  Client:    $($client.clientCode)"
Write-Host "  Insurer:   $($insurer.insurerCode)"
Write-Host "  Agent:     $($agent.agentCode)"
Write-Host "  Bank:      $($bank.bankCode)"
Write-Host "  Policy:    $($policy.policyNumber)"
Write-Host "  CN:        $($cn.noteId)"
Write-Host "  DN:        $($dn.noteId)"
```

---

## 📝 Manual Testing Checklist

Use this checklist for UAT:

### Authentication:
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Receives valid JWT token
- [ ] Token works for API calls

### Client Management:
- [ ] Create company client
- [ ] Create individual client
- [ ] View client list with clientCode
- [ ] Update client details
- [ ] Upload KYC documents
- [ ] Add client contacts

### Insurer Management:
- [ ] Create insurer with license
- [ ] License expiry optional (UAT)
- [ ] Past license dates allowed (UAT)
- [ ] View insurer list
- [ ] Update insurer details
- [ ] Add insurer email contacts

### Agent Management:
- [ ] Create individual agent
- [ ] Create company agent
- [ ] Set commission model
- [ ] Add agent contacts (no admin check in UAT)
- [ ] Upload agent KYC

### Bank Accounts:
- [ ] Create bank for client
- [ ] Create bank for insurer
- [ ] Create bank for agent
- [ ] NUBAN validation bypassed (UAT)
- [ ] Multi-country banks allowed (UAT)
- [ ] Set default account

### LOB Management:
- [ ] Create LOB with brokerage rules
- [ ] Create Sub-LOB with overrides
- [ ] Set minimum premium
- [ ] View LOB hierarchy

### Policy Management:
- [ ] Create policy with validation
- [ ] Past policy dates allowed (UAT)
- [ ] Minimum premium enforced
- [ ] View policy list
- [ ] Update policy details

### Credit/Debit Notes:
- [ ] Create Credit Note
- [ ] Create Debit Note
- [ ] Auto-calculate brokerage
- [ ] Auto-calculate VAT
- [ ] Auto-calculate agent commission
- [ ] Auto-calculate net amount
- [ ] Test co-insurance (CN only)
- [ ] Verify sequence numbers

### Endorsements:
- [ ] Create endorsement
- [ ] Track sum insured delta
- [ ] Track premium delta
- [ ] Auto-generate endorsement number

### Sequence Generation:
- [ ] All codes follow format
- [ ] No duplicates
- [ ] No gaps in sequence
- [ ] Year-based partitioning works

---

## ⚠️ Known UAT Bypasses

These are INTENTIONAL for testing:

1. **Past Policy Dates** - Allowed (will be restricted in production)
2. **License Expiry** - Optional (will be required in production)
3. **NUBAN Checksum** - Bypassed (will be enforced in production)
4. **Bank Countries** - Multi-country (may be restricted to NG in production)
5. **Agent Contacts** - No admin check (will be admin-only in production)

Search codebase for "UAT:" to find all bypasses.

---

## 🆘 Troubleshooting

### Common Issues:

**Issue:** 401 Unauthorized Error
- **Solution:** Ensure you're logged in and using valid token in headers

**Issue:** Validation Error on NUBAN
- **Solution:** In UAT, any 10-digit number works (checksum bypassed)

**Issue:** Policy minimum premium error
- **Solution:** Check LOB/Sub-LOB minimum premium settings

**Issue:** Sequence number not generated
- **Solution:** Check entity_sequences table exists

**Issue:** Can't create past-dated policy
- **Solution:** Should work in UAT - check if validation was re-enabled

---

## 📞 Support

For issues during UAT, check:
1. `UAT_COMPLETION_REPORT.md` - Complete system documentation
2. `DEEP_CHECK_ANALYSIS.md` - Technical deep dive
3. `UAT_FIXES_2025-10-17.md` - List of all fixes applied

---

**System Status:** ✅ Running and Ready for Testing  
**Last Updated:** October 17, 2025  
**Version:** 1.0.0-UAT
