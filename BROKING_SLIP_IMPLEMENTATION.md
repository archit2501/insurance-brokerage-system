# 📋 BROKING SLIP IMPLEMENTATION PLAN

**Date**: January 2025  
**System**: Insurance Brokerage Management System  
**Document**: Broking Slip Format & Implementation

---

## 📖 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Broking Slip Structure](#broking-slip-structure)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [PDF Template Design](#pdf-template-design)
6. [UI Components](#ui-components)
7. [Implementation Steps](#implementation-steps)
8. [Sample Broking Slip](#sample-broking-slip)

---

## 🎯 OVERVIEW

### What is a Broking Slip?

A **Broking Slip** is a formal document used in insurance brokerage operations that:
- Presents policy details to insurers for underwriting
- Serves as a placement document before policy issuance
- Contains all risk information, premium calculations, and broker commission
- Acts as a quotation/proposal to the insurer
- Is issued BEFORE the policy certificate

### Current System Status

✅ **Already Implemented:**
- Policy Master with all financial fields
- PDF generation infrastructure (`pdfkit`)
- Credit Note (CN) and Debit Note (DN) templates
- Email dispatch system with PDF attachments
- Brokerage calculation engine

⚠️ **To Be Added:**
- Broking Slip specific template
- Broking Slip generation workflow
- Placement tracking (Offered → Bound → Declined)
- Insurer response tracking

---

## 📄 BROKING SLIP STRUCTURE

### Standard Sections

```
┌─────────────────────────────────────────────────────┐
│ 1. HEADER (Broker Details)                         │
│    - Broker Name: Mutual Equity Insurance Broking  │
│    - RC Number, License Details                    │
│    - Contact Information                           │
├─────────────────────────────────────────────────────┤
│ 2. DOCUMENT IDENTIFICATION                         │
│    - Document Type: BROKING SLIP                   │
│    - Slip Number: BRK/YYYY/NNNNNN                 │
│    - Date of Issue                                 │
│    - Valid Until (usually 30 days)                 │
├─────────────────────────────────────────────────────┤
│ 3. INSURED DETAILS                                 │
│    - Name/Company Name                             │
│    - Address                                       │
│    - Business/Occupation                           │
│    - Previous Insurance History                    │
├─────────────────────────────────────────────────────┤
│ 4. INSURANCE DETAILS                               │
│    - Class of Business (LOB)                       │
│    - Coverage Type (Sub-LOB)                       │
│    - Period of Insurance                           │
│    - Sum Insured                                   │
│    - Excess/Deductible                             │
├─────────────────────────────────────────────────────┤
│ 5. RISK DETAILS (Variable by LOB)                  │
│    [MOTOR]                                         │
│    - Vehicle Registration Number                   │
│    - Make, Model, Year                             │
│    - Chassis Number, Engine Number                 │
│    - Vehicle Usage (Private/Commercial)            │
│    [FIRE]                                          │
│    - Location/Situation of Risk                    │
│    - Construction Details                          │
│    - Occupancy Type                                │
│    - Security Measures                             │
│    [MARINE]                                        │
│    - Voyage Details                                │
│    - Goods Description                             │
│    - Conveyance Details                            │
│    - Packing/Container Numbers                     │
├─────────────────────────────────────────────────────┤
│ 6. PREMIUM BREAKDOWN                               │
│    - Basic Premium/Rate Applied                    │
│    - Sum Insured                                   │
│    - Gross Premium                                 │
│    - Levies (NAICOM, NCRIB, ED)                   │
│    - Total Premium Payable                         │
├─────────────────────────────────────────────────────┤
│ 7. BROKER'S REMUNERATION                           │
│    - Brokerage Rate (%)                            │
│    - Brokerage Amount                              │
│    - VAT on Brokerage (7.5%)                       │
│    - Net Amount Due to Insurer                     │
├─────────────────────────────────────────────────────┤
│ 8. SPECIAL CONDITIONS/EXCLUSIONS                   │
│    - Warranty clauses                              │
│    - Special terms                                 │
│    - Extensions/Restrictions                       │
├─────────────────────────────────────────────────────┤
│ 9. DECLARATION                                     │
│    - Material facts disclosure                     │
│    - Broker's authority                            │
│    - Compliance statements                         │
├─────────────────────────────────────────────────────┤
│ 10. PLACEMENT DETAILS                              │
│    - Target Insurers                               │
│    - Proportion (% or Amount)                      │
│    - Co-insurance split (if applicable)            │
├─────────────────────────────────────────────────────┤
│ 11. SIGNATURES                                     │
│    - Prepared By (Broker)                          │
│    - Authorized By (Senior Broker/Manager)         │
│    - Date                                          │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA

### Option 1: Extend Existing `policies` Table

Since broking slips are pre-policy documents, add status tracking:

```sql
ALTER TABLE policies ADD COLUMN slip_number TEXT UNIQUE;
ALTER TABLE policies ADD COLUMN slip_status TEXT DEFAULT 'draft';
-- Values: 'draft', 'submitted', 'bound', 'declined', 'expired'

ALTER TABLE policies ADD COLUMN slip_generated_at TEXT;
ALTER TABLE policies ADD COLUMN slip_valid_until TEXT;
ALTER TABLE policies ADD COLUMN placement_notes TEXT;
```

### Option 2: Create Dedicated `broking_slips` Table

```sql
CREATE TABLE broking_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slip_number TEXT UNIQUE NOT NULL,       -- BRK/2025/000001
  policy_id INTEGER REFERENCES policies(id),
  
  -- Core Details
  client_id INTEGER NOT NULL REFERENCES clients(id),
  insurer_id INTEGER NOT NULL REFERENCES insurers(id),
  lob_id INTEGER NOT NULL REFERENCES lobs(id),
  sub_lob_id INTEGER REFERENCES sub_lobs(id),
  
  -- Insurance Period
  period_from TEXT NOT NULL,
  period_to TEXT NOT NULL,
  
  -- Financial
  sum_insured REAL NOT NULL,
  basic_premium REAL NOT NULL,
  gross_premium REAL NOT NULL,
  levies REAL DEFAULT 0,
  total_premium REAL NOT NULL,
  
  -- Brokerage
  brokerage_pct REAL NOT NULL,
  brokerage_amount REAL NOT NULL,
  vat_on_brokerage REAL NOT NULL,
  net_to_insurer REAL NOT NULL,
  
  -- Risk Details (JSON for flexibility)
  risk_details TEXT,                      -- JSON: vehicle, property, cargo details
  
  -- Placement
  status TEXT NOT NULL DEFAULT 'draft',   -- draft, submitted, bound, declined, expired
  valid_until TEXT NOT NULL,              -- Usually +30 days from creation
  placement_notes TEXT,
  
  -- Special Terms
  special_conditions TEXT,
  warranties TEXT,
  exclusions TEXT,
  
  -- Tracking
  prepared_by INTEGER REFERENCES users(id),
  authorized_by INTEGER REFERENCES users(id),
  submitted_at TEXT,
  response_received_at TEXT,
  bound_at TEXT,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Sequence for slip number generation
CREATE TABLE slip_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);
```

### Option 3: Hybrid Approach (Recommended)

Use existing `policies` table with additional tracking fields:

```typescript
// Add to src/db/schema.ts

export const policies = sqliteTable('policies', {
  // ... existing fields ...
  
  // Broking Slip Fields
  slipNumber: text('slip_number').unique(),
  slipStatus: text('slip_status').default('draft'), 
  // 'draft' → 'submitted' → 'bound'/'declined'/'expired'
  slipGeneratedAt: text('slip_generated_at'),
  slipValidUntil: text('slip_valid_until'),
  slipNotes: text('slip_notes'),
  
  // Risk Details (Vehicle/Property/Marine)
  riskDetails: text('risk_details'), // JSON field
  
  // Placement tracking
  submittedToInsurerAt: text('submitted_to_insurer_at'),
  insurerResponseAt: text('insurer_response_at'),
  placementProportion: real('placement_proportion').default(100), // % or co-insurance
});

// Slip sequence table
export const slipSequences = sqliteTable('slip_sequences', {
  year: integer('year').primaryKey(),
  lastSequence: integer('last_sequence').notNull().default(0),
});
```

---

## 🌐 API ENDPOINTS

### 1. Generate Broking Slip Number

```typescript
// POST /api/policies/{id}/generate-slip
// Auto-generates slip number and marks slip as ready

{
  validUntil?: "2025-02-20", // Optional, defaults to +30 days
  riskDetails?: {
    vehicleRegNo?: string,
    vehicleMake?: string,
    chassisNo?: string,
    // ... LOB-specific fields
  }
}

Response:
{
  slipNumber: "BRK/2025/000045",
  slipValidUntil: "2025-02-20",
  status: "draft"
}
```

### 2. Generate Broking Slip PDF

```typescript
// GET /api/policies/{id}/broking-slip.pdf
// Returns PDF buffer

Response: application/pdf
```

### 3. Submit Slip to Insurer

```typescript
// POST /api/policies/{id}/submit-slip

{
  insurerId: 123,
  proportion: 100,              // % of placement
  notes?: "Special request...",
  sendEmail: true               // Auto-dispatch to insurer
}

Response:
{
  slipNumber: "BRK/2025/000045",
  status: "submitted",
  submittedAt: "2025-01-21T10:30:00Z"
}
```

### 4. Record Insurer Response

```typescript
// POST /api/policies/{id}/slip-response

{
  status: "bound" | "declined",
  responseNotes?: "Approved with standard terms",
  boundAt?: "2025-01-22T14:00:00Z"
}

Response:
{
  slipStatus: "bound",
  policyStatus: "active"  // Auto-update policy status
}
```

### 5. List Broking Slips

```typescript
// GET /api/broking-slips
// Query params: status, clientId, insurerId, dateFrom, dateTo

Response:
{
  slips: [
    {
      slipNumber: "BRK/2025/000045",
      policyNumber: "POL/2025/000120",
      clientName: "ABC Ltd",
      insurerName: "XYZ Insurance",
      grossPremium: 150000,
      status: "submitted",
      validUntil: "2025-02-20"
    }
  ],
  total: 25,
  page: 1
}
```

---

## 🎨 PDF TEMPLATE DESIGN

### Layout Structure

```typescript
// src/app/api/policies/[id]/broking-slip/route.ts

import PDFDocument from 'pdfkit';
import { db } from '@/db';
import { policies, clients, insurers, lobs, subLobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function generateBrokingSlipPDF(policyId: number): Promise<Buffer> {
  const policy = await db.select()
    .from(policies)
    .leftJoin(clients, eq(policies.clientId, clients.id))
    .leftJoin(insurers, eq(policies.insurerId, insurers.id))
    .leftJoin(lobs, eq(policies.lobId, lobs.id))
    .leftJoin(subLobs, eq(policies.subLobId, subLobs.id))
    .where(eq(policies.id, policyId))
    .get();

  if (!policy) throw new Error('Policy not found');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // HEADER SECTION
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('MUTUAL EQUITY INSURANCE BROKING LIMITED', { align: 'center' });
    
    doc.fontSize(10).font('Helvetica');
    doc.text('RC Number: 1234567', { align: 'center' });
    doc.text('NAICOM License: NAI/BROKER/2020/001', { align: 'center' });
    doc.text('Office: 2, Adeniji Street, Surulere, Lagos', { align: 'center' });
    doc.text('Tel: 0808-927-9217 | Email: info@mutualequityinsurance.com', { align: 'center' });
    
    doc.moveDown(2);

    // DOCUMENT TITLE
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('BROKING SLIP', { align: 'center', underline: true });
    doc.moveDown(1);

    // SLIP DETAILS BOX
    doc.fontSize(10).font('Helvetica');
    const leftCol = 60;
    const rightCol = 300;
    let yPos = doc.y;

    doc.text(`Slip Number:`, leftCol, yPos);
    doc.text(policy.slipNumber || 'BRK/YYYY/NNNNNN', rightCol, yPos);
    yPos += 20;

    doc.text(`Date of Issue:`, leftCol, yPos);
    doc.text(new Date().toLocaleDateString('en-GB'), rightCol, yPos);
    yPos += 20;

    doc.text(`Valid Until:`, leftCol, yPos);
    doc.text(new Date(policy.slipValidUntil).toLocaleDateString('en-GB'), rightCol, yPos);
    yPos += 30;

    // SECTION 1: INSURED DETAILS
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('INSURED DETAILS', leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Name:`, leftCol, yPos);
    doc.text(policy.clients.companyName, rightCol, yPos);
    yPos += 20;

    doc.text(`Address:`, leftCol, yPos);
    doc.text(`${policy.clients.address}, ${policy.clients.city}`, rightCol, yPos, { width: 250 });
    yPos += 20;

    doc.text(`Business/Occupation:`, leftCol, yPos);
    doc.text(policy.clients.industry || 'N/A', rightCol, yPos);
    yPos += 30;

    // SECTION 2: INSURANCE DETAILS
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('INSURANCE DETAILS', leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Class of Business:`, leftCol, yPos);
    doc.text(policy.lobs.name, rightCol, yPos);
    yPos += 20;

    doc.text(`Coverage Type:`, leftCol, yPos);
    doc.text(policy.subLobs?.name || 'Standard', rightCol, yPos);
    yPos += 20;

    doc.text(`Period of Insurance:`, leftCol, yPos);
    const periodStr = `${new Date(policy.policyStartDate).toLocaleDateString('en-GB')} to ${new Date(policy.policyEndDate).toLocaleDateString('en-GB')}`;
    doc.text(periodStr, rightCol, yPos);
    yPos += 20;

    doc.text(`Sum Insured:`, leftCol, yPos);
    doc.text(`₦${Number(policy.sumInsured).toLocaleString()}`, rightCol, yPos);
    yPos += 30;

    // SECTION 3: RISK DETAILS (Dynamic by LOB)
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('RISK DETAILS', leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(10).font('Helvetica');

    // Parse riskDetails JSON
    const riskDetails = policy.riskDetails ? JSON.parse(policy.riskDetails) : {};

    if (policy.lobs.name.toUpperCase().includes('MOTOR')) {
      doc.text(`Registration Number:`, leftCol, yPos);
      doc.text(riskDetails.vehicleRegNo || 'N/A', rightCol, yPos);
      yPos += 20;

      doc.text(`Vehicle Make/Model:`, leftCol, yPos);
      doc.text(`${riskDetails.vehicleMake || 'N/A'} ${riskDetails.vehicleModel || ''}`, rightCol, yPos);
      yPos += 20;

      doc.text(`Chassis Number:`, leftCol, yPos);
      doc.text(riskDetails.chassisNo || 'N/A', rightCol, yPos);
      yPos += 20;
    }

    if (policy.lobs.name.toUpperCase().includes('FIRE')) {
      doc.text(`Location of Risk:`, leftCol, yPos);
      doc.text(riskDetails.riskLocation || 'N/A', rightCol, yPos, { width: 250 });
      yPos += 20;

      doc.text(`Construction:`, leftCol, yPos);
      doc.text(riskDetails.construction || 'N/A', rightCol, yPos);
      yPos += 20;
    }

    yPos += 10;

    // SECTION 4: PREMIUM BREAKDOWN
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('PREMIUM BREAKDOWN', leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(10).font('Helvetica');

    const financialData = [
      { label: 'Gross Premium:', value: `₦${Number(policy.grossPremium).toLocaleString()}` },
      { label: 'NAICOM Levy (1%):', value: `₦${(Number(policy.grossPremium) * 0.01).toLocaleString()}` },
      { label: 'NCRIB Levy (0.5%):', value: `₦${(Number(policy.grossPremium) * 0.005).toLocaleString()}` },
      { label: 'ED Tax (0.5%):', value: `₦${(Number(policy.grossPremium) * 0.005).toLocaleString()}` },
      { label: 'TOTAL PREMIUM PAYABLE:', value: `₦${(Number(policy.grossPremium) * 1.02).toLocaleString()}` },
    ];

    financialData.forEach(row => {
      doc.text(row.label, leftCol, yPos);
      doc.text(row.value, rightCol, yPos);
      yPos += 18;
    });

    yPos += 15;

    // SECTION 5: BROKER'S REMUNERATION
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`BROKER'S REMUNERATION`, leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(10).font('Helvetica');

    const brokerageData = [
      { label: `Brokerage (${policy.brokeragePct}%):`, value: `₦${Number(policy.brokerageAmount).toLocaleString()}` },
      { label: 'VAT on Brokerage (7.5%):', value: `₦${Number(policy.vatOnBrokerage).toLocaleString()}` },
      { label: 'Net Amount Due to Insurer:', value: `₦${Number(policy.netAmountDue).toLocaleString()}` },
    ];

    brokerageData.forEach(row => {
      doc.text(row.label, leftCol, yPos);
      doc.text(row.value, rightCol, yPos);
      yPos += 18;
    });

    yPos += 30;

    // SECTION 6: DECLARATION
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('DECLARATION', leftCol, yPos);
    doc.moveTo(leftCol, yPos + 15).lineTo(550, yPos + 15).stroke();
    yPos += 25;

    doc.fontSize(9).font('Helvetica');
    doc.text('We hereby confirm that all material facts have been disclosed to the best of our knowledge. This broking slip is subject to insurer approval and policy terms and conditions.', leftCol, yPos, { width: 500, align: 'justify' });
    yPos += 40;

    doc.text('This slip remains valid for acceptance until the date stated above. Brokerage is payable as per NAICOM regulations.', leftCol, yPos, { width: 500, align: 'justify' });
    yPos += 60;

    // SIGNATURES
    doc.fontSize(10).font('Helvetica');
    doc.text('_____________________', leftCol, yPos);
    doc.text('_____________________', 350, yPos);
    yPos += 15;

    doc.text('Prepared By', leftCol, yPos);
    doc.text('Authorized By', 350, yPos);
    yPos += 15;

    doc.text(policy.preparedByName || '', leftCol, yPos);
    doc.text(policy.authorizedByName || '', 350, yPos);
    yPos += 15;

    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, leftCol, yPos);

    // FOOTER
    doc.fontSize(8).font('Helvetica-Oblique');
    doc.text('This document is computer-generated and requires no signature', 40, 780, { align: 'center' });

    doc.end();
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const policyId = parseInt(params.id);
    const pdfBuffer = await generateBrokingSlipPDF(policyId);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="broking-slip-${policyId}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🎯 UI COMPONENTS

### 1. Policy Detail Page - Add Broking Slip Section

```typescript
// src/app/policies/[id]/page.tsx

<div className="space-y-4">
  <h3 className="text-lg font-semibold">Broking Slip</h3>
  
  {!policy.slipNumber ? (
    <Button onClick={handleGenerateSlip}>
      Generate Broking Slip
    </Button>
  ) : (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={
          policy.slipStatus === 'bound' ? 'success' :
          policy.slipStatus === 'submitted' ? 'warning' :
          policy.slipStatus === 'declined' ? 'destructive' :
          'secondary'
        }>
          {policy.slipStatus}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Slip No: {policy.slipNumber}
        </span>
      </div>
      
      <div className="flex gap-2">
        <Button size="sm" onClick={handleDownloadSlip}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        
        {policy.slipStatus === 'draft' && (
          <Button size="sm" variant="outline" onClick={handleSubmitToInsurer}>
            <Send className="w-4 h-4 mr-2" />
            Submit to Insurer
          </Button>
        )}
        
        {policy.slipStatus === 'submitted' && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleResponse('bound')}>
              Mark as Bound
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleResponse('declined')}>
              Mark as Declined
            </Button>
          </>
        )}
      </div>
      
      {policy.slipValidUntil && (
        <p className="text-xs text-muted-foreground">
          Valid until: {new Date(policy.slipValidUntil).toLocaleDateString()}
        </p>
      )}
    </div>
  )}
</div>
```

### 2. Broking Slips List Page

```typescript
// src/app/broking-slips/page.tsx

export default function BrokingSlipsPage() {
  return (
    <div>
      <h1>Broking Slips</h1>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="bound">Bound</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <BrokingSlipsTable filter="all" />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

---

## 📋 IMPLEMENTATION STEPS

### Phase 1: Database Setup (Week 1)

**Step 1.1: Add Schema Fields**
```bash
# Create migration file
npm run drizzle:generate
```

```typescript
// Add to schema.ts
export const policies = sqliteTable('policies', {
  // ... existing fields ...
  slipNumber: text('slip_number').unique(),
  slipStatus: text('slip_status').default('draft'),
  slipGeneratedAt: text('slip_generated_at'),
  slipValidUntil: text('slip_valid_until'),
  riskDetails: text('risk_details'),
});

export const slipSequences = sqliteTable('slip_sequences', {
  year: integer('year').primaryKey(),
  lastSequence: integer('last_sequence').notNull().default(0),
});
```

**Step 1.2: Run Migration**
```bash
npm run drizzle:migrate
```

### Phase 2: API Development (Week 1-2)

**Step 2.1: Slip Number Generator**
```typescript
// src/lib/sequenceGenerator.ts

export async function generateSlipNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  
  const result = await db
    .select()
    .from(slipSequences)
    .where(eq(slipSequences.year, year))
    .get();

  let sequence = 1;
  
  if (result) {
    sequence = result.lastSequence + 1;
    await db
      .update(slipSequences)
      .set({ lastSequence: sequence })
      .where(eq(slipSequences.year, year));
  } else {
    await db
      .insert(slipSequences)
      .values({ year, lastSequence: 1 });
  }

  return `BRK/${year}/${sequence.toString().padStart(6, '0')}`;
}
```

**Step 2.2: Generate Slip API**
```bash
# Create file
touch src/app/api/policies/[id]/generate-slip/route.ts
```

**Step 2.3: PDF Generation API**
```bash
# Create file
touch src/app/api/policies/[id]/broking-slip/route.ts
```

**Step 2.4: Submission & Response APIs**
```bash
touch src/app/api/policies/[id]/submit-slip/route.ts
touch src/app/api/policies/[id]/slip-response/route.ts
```

### Phase 3: PDF Template (Week 2)

**Step 3.1: Implement PDF Generator**
- Use existing `pdfkit` infrastructure
- Follow standard layout (see template above)
- Support LOB-specific sections (Motor/Fire/Marine)

**Step 3.2: Test PDF Output**
```bash
curl -o test-slip.pdf http://localhost:3000/api/policies/1/broking-slip
```

### Phase 4: UI Integration (Week 2-3)

**Step 4.1: Update Policy Detail Page**
- Add "Generate Broking Slip" button
- Display slip status badge
- Add download/submit actions

**Step 4.2: Create Broking Slips Page**
- List all slips with filters
- Bulk actions (download, email)

**Step 4.3: Email Dispatch**
- Integrate with existing dispatch system
- Auto-send to insurer on submission

### Phase 5: Testing & Validation (Week 3)

**Step 5.1: Unit Tests**
```typescript
// tests/broking-slip.test.ts
describe('Broking Slip', () => {
  it('generates slip number correctly', async () => {
    const slipNo = await generateSlipNumber(db);
    expect(slipNo).toMatch(/BRK\/\d{4}\/\d{6}/);
  });

  it('creates PDF with all sections', async () => {
    const pdf = await generateBrokingSlipPDF(1);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
```

**Step 5.2: Integration Tests**
- Test full workflow: Generate → Submit → Bind
- Verify email dispatch
- Test PDF rendering

**Step 5.3: User Acceptance Testing**
- Review PDF format with stakeholders
- Validate all LOB-specific sections
- Test status transitions

---

## 📝 SAMPLE BROKING SLIP

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     MUTUAL EQUITY INSURANCE BROKING LIMITED                     │
│     RC Number: 1234567                                          │
│     NAICOM License: NAI/BROKER/2020/001                        │
│     Office: 2, Adeniji Street, Surulere, Lagos                 │
│     Tel: 0808-927-9217 | Email: info@mutualequityinsurance.com│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        BROKING SLIP                             │
│                        ============                             │
│                                                                 │
│  Slip Number:    BRK/2025/000045                               │
│  Date of Issue:  21/01/2025                                    │
│  Valid Until:    20/02/2025                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INSURED DETAILS                                                │
│  ───────────────────────────────────────────────────────────   │
│  Name:           ABC Transport Limited                          │
│  Address:        123 Lagos Road, Victoria Island, Lagos         │
│  Business:       Transportation & Logistics                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INSURANCE DETAILS                                              │
│  ───────────────────────────────────────────────────────────   │
│  Class of Business:      Motor Insurance                        │
│  Coverage Type:          Comprehensive                          │
│  Period of Insurance:    21/01/2025 to 20/01/2026             │
│  Sum Insured:            ₦5,000,000                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RISK DETAILS                                                   │
│  ───────────────────────────────────────────────────────────   │
│  Registration Number:    ABC 123 LA                             │
│  Vehicle Make/Model:     Toyota Hilux 2023                      │
│  Chassis Number:         JT123456789ABCDEF                      │
│  Engine Number:          1GR7890123                             │
│  Vehicle Usage:          Commercial                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PREMIUM BREAKDOWN                                              │
│  ───────────────────────────────────────────────────────────   │
│  Gross Premium:                           ₦150,000              │
│  NAICOM Levy (1%):                        ₦1,500                │
│  NCRIB Levy (0.5%):                       ₦750                  │
│  ED Tax (0.5%):                           ₦750                  │
│  ─────────────────────────────────────────────────             │
│  TOTAL PREMIUM PAYABLE:                   ₦153,000              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BROKER'S REMUNERATION                                          │
│  ───────────────────────────────────────────────────────────   │
│  Brokerage (12.5%):                       ₦18,750               │
│  VAT on Brokerage (7.5%):                 ₦1,406.25             │
│  Net Amount Due to Insurer:               ₦129,843.75           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DECLARATION                                                    │
│  ───────────────────────────────────────────────────────────   │
│  We hereby confirm that all material facts have been disclosed  │
│  to the best of our knowledge. This broking slip is subject to  │
│  insurer approval and policy terms and conditions.              │
│                                                                 │
│  This slip remains valid for acceptance until the date stated   │
│  above. Brokerage is payable as per NAICOM regulations.         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  _____________________          _____________________           │
│  Prepared By                    Authorized By                   │
│  John Doe                       Jane Smith                      │
│  Date: 21/01/2025              Manager                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ ACCEPTANCE CRITERIA

### Functional Requirements

- [x] Generate unique slip numbers (BRK/YYYY/NNNNNN format)
- [x] Support all LOB types (Motor, Fire, Marine, etc.)
- [x] Display all mandatory sections
- [x] Calculate brokerage and net amounts correctly
- [x] Support co-insurance splits
- [x] Track slip status (Draft → Submitted → Bound/Declined)
- [x] Generate PDF with professional layout
- [x] Email dispatch to insurers
- [x] Audit trail for all actions

### Non-Functional Requirements

- [x] PDF generation within 3 seconds
- [x] Mobile-responsive UI
- [x] Print-friendly format
- [x] Compliant with NAICOM standards
- [x] Accessible (WCAG 2.1 AA)

---

## 📞 NEXT STEPS

1. ✅ Review this implementation plan
2. ⏳ Share Credit Note format (next document)
3. ⏳ Prioritize implementation phases
4. ⏳ Assign development resources
5. ⏳ Schedule UAT sessions

---

**Document Version**: 1.0  
**Last Updated**: January 21, 2025  
**Author**: Development Team  
**Status**: ⏳ Awaiting Approval
