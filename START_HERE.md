# 🎯 QUICK START - Test Credentials & Access

## ✅ SYSTEM IS RUNNING!

**Server Status:** ✅ ONLINE  
**URL:** http://localhost:3000  
**API:** http://localhost:3000/api

---

## 🔑 TEST CREDENTIALS

Use any of these test accounts:

### Option 1: Primary Test Account
```
Email:    testuser@insurancebrokerage.com
Password: Test@123456
```

### Option 2: Admin Account
```
Email:    admin@insurancebrokerage.com
Password: Admin@123456
```

### Option 3: Demo Account
```
Email:    demo@test.com
Password: Demo@123456
```

**Note:** If the account doesn't exist yet, the system will create it on first login/registration.

---

## 🚀 HOW TO ACCESS

### Method 1: Web Browser (Recommended)
1. Open your browser
2. Go to: **http://localhost:3000**
3. Click "Register" or "Login"
4. Use credentials above

### Method 2: API Testing (Postman/Thunder Client)

#### Step 1: Register/Login
```http
POST http://localhost:3000/api/auth/sign-up
Content-Type: application/json

{
  "email": "testuser@insurancebrokerage.com",
  "password": "Test@123456",
  "name": "Test User"
}
```

Or if account exists:
```http
POST http://localhost:3000/api/auth/sign-in
Content-Type: application/json

{
  "email": "testuser@insurancebrokerage.com",
  "password": "Test@123456"
}
```

#### Step 2: Use the Token
Response will contain:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "1",
    "email": "testuser@insurancebrokerage.com"
  }
}
```

#### Step 3: Make API Calls
Use these headers for all subsequent requests:
```
Authorization: Bearer <your_token>
x-user-id: <user_id>
Content-Type: application/json
```

---

## 🧪 QUICK TEST - Create Your First Client

```http
POST http://localhost:3000/api/clients
Authorization: Bearer <your_token>
x-user-id: <user_id>
Content-Type: application/json

{
  "companyName": "Test Company Ltd",
  "clientType": "Company",
  "cacRcNumber": "RC123456",
  "tin": "12345678",
  "industry": "Manufacturing",
  "address": "123 Test Street",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "status": "active"
}
```

**Expected Response:**
```json
{
  "id": 1,
  "clientCode": "MEIBL/CL/2025/CORP/00001",
  "companyName": "Test Company Ltd",
  ...
}
```

---

## 📋 AVAILABLE ENDPOINTS (All Require Authentication)

### Authentication
- POST `/api/auth/sign-up` - Register new user
- POST `/api/auth/sign-in` - Login
- GET `/api/auth/get-session` - Get current session

### Clients
- GET `/api/clients` - List all clients
- POST `/api/clients` - Create client
- PUT `/api/clients?id=1` - Update client
- DELETE `/api/clients?id=1` - Delete client

### Insurers
- GET `/api/insurers` - List all insurers
- POST `/api/insurers` - Create insurer
- PUT `/api/insurers?id=1` - Update insurer
- DELETE `/api/insurers?id=1` - Delete insurer

### Agents
- GET `/api/agents` - List all agents
- POST `/api/agents` - Create agent
- PUT `/api/agents/{id}` - Update agent

### Banks
- GET `/api/banks` - List all bank accounts
- POST `/api/banks` - Create bank account
- PUT `/api/banks/{id}` - Update bank account

### LOBs (Lines of Business)
- GET `/api/lobs` - List all LOBs
- POST `/api/lobs` - Create LOB
- POST `/api/lobs/{id}/sublobs` - Create Sub-LOB

### Policies
- GET `/api/policies` - List all policies
- POST `/api/policies` - Create policy
- PUT `/api/policies?id=1` - Update policy

### Credit/Debit Notes
- GET `/api/notes` - List all notes
- POST `/api/notes` - Create CN/DN
- PUT `/api/notes?id=1` - Update note

### Endorsements
- GET `/api/endorsements` - List endorsements
- POST `/api/endorsements` - Create endorsement

---

## 🎬 COMPLETE WORKFLOW EXAMPLE

### 1. Create Client
```json
POST /api/clients
{
  "companyName": "Acme Manufacturing",
  "clientType": "Company",
  "cacRcNumber": "RC987654",
  "tin": "87654321",
  "address": "123 Industrial Ave",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria"
}
→ Returns: clientCode: "MEIBL/CL/2025/CORP/00001"
```

### 2. Create Insurer
```json
POST /api/insurers
{
  "companyName": "Premier Insurance",
  "shortName": "PIC",
  "licenseNumber": "LIC2025001",
  "licenseExpiry": "2026-12-31",
  "address": "456 Insurance Blvd",
  "city": "Lagos",
  "state": "Lagos"
}
→ Returns: insurerCode: "MEIBL/IN/2025/00001"
```

### 3. Create LOB
```json
POST /api/lobs
{
  "name": "Motor Insurance",
  "code": "MOTOR",
  "defaultBrokeragePct": 10,
  "defaultVatPct": 7.5,
  "minPremium": 5000
}
→ Returns: id: 1
```

### 4. Create Policy
```json
POST /api/policies
{
  "clientId": 1,
  "insurerId": 1,
  "lobId": 1,
  "sumInsured": 5000000,
  "grossPremium": 75000,
  "policyStartDate": "2025-10-17",
  "policyEndDate": "2026-10-16"
}
→ Returns: policyNumber: "MEIBL/PL/2025/00001"
```

### 5. Create Credit Note
```json
POST /api/notes
{
  "noteType": "CN",
  "clientId": 1,
  "insurerId": 1,
  "policyId": 1,
  "grossPremium": 75000,
  "brokeragePct": 12,
  "vatPct": 7.5,
  "agentCommissionPct": 2.5,
  "levies": {
    "niacom": 150,
    "ncrib": 75,
    "ed_tax": 50
  }
}
→ Returns: noteId: "CN/2025/000001"
→ Auto-calculates: netAmountDue, brokerageAmount, etc.
```

---

## 🔍 VERIFICATION CHECKLIST

After logging in, verify these features work:

- [ ] Can create client (Company type)
- [ ] Can create client (Individual type)
- [ ] clientCode is auto-generated (MEIBL/CL/2025/CORP/00001)
- [ ] Can create insurer
- [ ] insurerCode is auto-generated (MEIBL/IN/2025/00001)
- [ ] Can create agent
- [ ] agentCode is auto-generated (MEIBL/AG/2025/IND/00001)
- [ ] Can create bank account
- [ ] bankCode is auto-generated (MEIBL/BK/2025/00001)
- [ ] Can create LOB
- [ ] Can create Sub-LOB under LOB
- [ ] Can create policy
- [ ] policyNumber is auto-generated (MEIBL/PL/2025/00001)
- [ ] Minimum premium is enforced
- [ ] Can create Credit Note
- [ ] CN noteId is auto-generated (CN/2025/000001)
- [ ] Financial calculations are automatic
- [ ] Can create Debit Note
- [ ] DN noteId is auto-generated (DN/2025/000001)

---

## 📚 DOCUMENTATION AVAILABLE

1. **`TEST_CREDENTIALS_AND_GUIDE.md`** - Complete testing guide with examples
2. **`UAT_COMPLETION_REPORT.md`** - Full system status and UAT readiness
3. **`DEEP_CHECK_ANALYSIS.md`** - Technical deep dive and analysis
4. **`UAT_FIXES_2025-10-17.md`** - List of all UAT fixes applied
5. **`complete-workflow-test.ps1`** - Automated test script

---

## ⚠️ IMPORTANT NOTES

### UAT Relaxations (For Testing Only):
1. **Past Policy Dates** - Allowed (will be restricted in production)
2. **License Expiry** - Optional (will be required in production)
3. **NUBAN Validation** - Bypassed (any 10-digit number works)
4. **Multi-Country Banks** - Allowed (may be restricted to NG in production)

### All Endpoints Now Require Authentication:
- ✅ Policies API - Protected
- ✅ Insurers API - Protected
- ✅ Banks API - Protected
- ✅ LOBs API - Protected
- ✅ Clients API - Protected
- ✅ Notes API - Protected

---

## 🆘 TROUBLESHOOTING

**Problem:** Can't login
- **Solution:** Try registering first with the sign-up endpoint

**Problem:** 401 Unauthorized error
- **Solution:** Check you're using the Bearer token in Authorization header

**Problem:** Validation errors
- **Solution:** Check required fields in the API documentation

**Problem:** Sequence numbers not generating
- **Solution:** Database may need initialization - create one entity of each type

**Problem:** Server not responding
- **Solution:** Restart with `npm run dev`

---

## 🎯 NEXT STEPS

1. ✅ **Server is running** at http://localhost:3000
2. ✅ **Use test credentials** provided above
3. ✅ **Test in browser** or use API client (Postman/Thunder Client)
4. ✅ **Follow workflow** in TEST_CREDENTIALS_AND_GUIDE.md
5. ✅ **Run automated test** with complete-workflow-test.ps1

---

## 📞 QUICK REFERENCE

**Email:** testuser@insurancebrokerage.com  
**Password:** Test@123456  
**URL:** http://localhost:3000  
**API:** http://localhost:3000/api  
**Status:** ✅ READY FOR TESTING

---

**Last Updated:** October 17, 2025  
**System Version:** 1.0.0-UAT  
**Status:** ✅ ALL SYSTEMS GO!
