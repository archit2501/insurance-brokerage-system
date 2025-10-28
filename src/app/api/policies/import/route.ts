import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, importBatches, importBatchSequences, clients, insurers, lobs, entitySequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface CSVRow {
  policyNumber?: string;
  clientCode: string;
  insurerCode: string;
  lobCode: string;
  sumInsured: string;
  grossPremium: string;
  policyStartDate: string;
  policyEndDate: string;
  currency?: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  error: string;
}

/**
 * POST /api/policies/import
 * Bulk import policies from CSV
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    // Read CSV content
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const requiredFields = ['clientCode', 'insurerCode', 'lobCode', 'sumInsured', 'grossPremium', 'policyStartDate', 'policyEndDate'];
    
    const missingFields = requiredFields.filter(field => !header.includes(field));
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required columns: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Create import batch
    const currentYear = new Date().getFullYear();
    const now = new Date().toISOString();

    const batchNumber = await db.transaction(async (tx) => {
      let sequence = await tx.select()
        .from(importBatchSequences)
        .where(eq(importBatchSequences.year, currentYear))
        .limit(1);

      let nextSeq = 1;
      if (sequence.length > 0) {
        nextSeq = sequence[0].lastSeq + 1;
        await tx.update(importBatchSequences)
          .set({ lastSeq: nextSeq, updatedAt: now })
          .where(eq(importBatchSequences.year, currentYear));
      } else {
        await tx.insert(importBatchSequences)
          .values({ year: currentYear, lastSeq: nextSeq, createdAt: now, updatedAt: now });
      }

      return `IMP/${currentYear}/${String(nextSeq).padStart(6, '0')}`;
    });

    const [batch] = await db.insert(importBatches).values({
      batchNumber,
      importType: 'policies',
      fileName: file.name,
      fileSize: file.size,
      totalRows: lines.length - 1,
      status: 'processing',
      startedAt: now,
      importedBy: parseInt(session.user.id),
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Parse and validate rows
    const validationErrors: ValidationError[] = [];
    const validRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      header.forEach((key, index) => {
        row[key] = values[index] || '';
      });

      const rowErrors: ValidationError[] = [];

      // Validate required fields
      requiredFields.forEach(field => {
        if (!row[field] || row[field] === '') {
          rowErrors.push({ row: i, field, value: row[field], error: 'Required field is missing' });
        }
      });

      // Validate numeric fields
      if (row.sumInsured && isNaN(parseFloat(row.sumInsured))) {
        rowErrors.push({ row: i, field: 'sumInsured', value: row.sumInsured, error: 'Must be a valid number' });
      }
      if (row.grossPremium && isNaN(parseFloat(row.grossPremium))) {
        rowErrors.push({ row: i, field: 'grossPremium', value: row.grossPremium, error: 'Must be a valid number' });
      }

      // Validate dates
      if (row.policyStartDate && isNaN(Date.parse(row.policyStartDate))) {
        rowErrors.push({ row: i, field: 'policyStartDate', value: row.policyStartDate, error: 'Invalid date format (use YYYY-MM-DD)' });
      }
      if (row.policyEndDate && isNaN(Date.parse(row.policyEndDate))) {
        rowErrors.push({ row: i, field: 'policyEndDate', value: row.policyEndDate, error: 'Invalid date format (use YYYY-MM-DD)' });
      }

      // Validate date range
      if (row.policyStartDate && row.policyEndDate && new Date(row.policyStartDate) >= new Date(row.policyEndDate)) {
        rowErrors.push({ row: i, field: 'policyEndDate', value: row.policyEndDate, error: 'End date must be after start date' });
      }

      if (rowErrors.length > 0) {
        validationErrors.push(...rowErrors);
      } else {
        validRows.push({ rowNumber: i, data: row });
      }
    }

    // If validation errors, return them without importing
    if (validationErrors.length > 0) {
      await db.update(importBatches)
        .set({
          status: 'failed',
          failedRows: validationErrors.length,
          successRows: 0,
          validationErrors: JSON.stringify(validationErrors),
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(importBatches.id, batch.id));

      return NextResponse.json({
        batchNumber,
        status: 'failed',
        totalRows: lines.length - 1,
        validRows: validRows.length,
        invalidRows: validationErrors.length,
        validationErrors: validationErrors.slice(0, 100), // Return first 100 errors
        message: `Validation failed. Found ${validationErrors.length} errors. Fix errors and try again.`
      }, { status: 400 });
    }

    // Import valid rows
    let successCount = 0;
    let failCount = 0;
    const importErrors: any[] = [];

    for (const validRow of validRows) {
      try {
        const row = validRow.data;

        // Lookup references
        const [client] = await db.select().from(clients).where(eq(clients.clientCode, row.clientCode)).limit(1);
        if (!client) {
          throw new Error(`Client not found: ${row.clientCode}`);
        }

        const [insurer] = await db.select().from(insurers).where(eq(insurers.insurerCode, row.insurerCode)).limit(1);
        if (!insurer) {
          throw new Error(`Insurer not found: ${row.insurerCode}`);
        }

        const [lob] = await db.select().from(lobs).where(eq(lobs.code, row.lobCode)).limit(1);
        if (!lob) {
          throw new Error(`LOB not found: ${row.lobCode}`);
        }

        // Generate policy number if not provided
        let policyNumber = row.policyNumber || '';
        if (!policyNumber) {
          const year = new Date(row.policyStartDate).getFullYear();
          const entitySeq = await db.transaction(async (tx) => {
            let seq = await tx.select().from(entitySequences)
              .where(and(eq(entitySequences.entity, 'POLICY'), eq(entitySequences.year, year)))
              .limit(1);

            let nextSeq = 1;
            if (seq.length > 0) {
              nextSeq = seq[0].lastSeq + 1;
              await tx.update(entitySequences)
                .set({ lastSeq: nextSeq, updatedAt: now })
                .where(and(eq(entitySequences.entity, 'POLICY'), eq(entitySequences.year, year)));
            } else {
              await tx.insert(entitySequences)
                .values({ entity: 'POLICY', year, lastSeq: nextSeq, createdAt: now, updatedAt: now });
            }
            return nextSeq;
          });

          policyNumber = `POL/${year}/${String(entitySeq).padStart(6, '0')}`;
        }

        // Check for duplicate
        const [existing] = await db.select().from(policies).where(eq(policies.policyNumber, policyNumber)).limit(1);
        if (existing) {
          throw new Error(`Policy number already exists: ${policyNumber}`);
        }

        // Insert policy
        await db.insert(policies).values({
          policyNumber,
          clientId: client.id,
          insurerId: insurer.id,
          lobId: lob.id,
          subLobId: null,
          rfqId: null,
          sumInsured: parseFloat(row.sumInsured),
          grossPremium: parseFloat(row.grossPremium),
          currency: row.currency || 'NGN',
          policyStartDate: row.policyStartDate,
          policyEndDate: row.policyEndDate,
          status: 'active',
          isRenewal: false,
          createdBy: parseInt(session.user.id),
          createdAt: now,
          updatedAt: now,
        });

        successCount++;
      } catch (error: any) {
        failCount++;
        importErrors.push({
          row: validRow.rowNumber,
          error: error.message || 'Unknown error'
        });
      }
    }

    // Update batch status
    await db.update(importBatches)
      .set({
        status: failCount === 0 ? 'completed' : 'completed',
        successRows: successCount,
        failedRows: failCount,
        validationErrors: importErrors.length > 0 ? JSON.stringify(importErrors) : null,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(importBatches.id, batch.id));

    return NextResponse.json({
      batchNumber,
      status: failCount === 0 ? 'success' : 'partial',
      totalRows: lines.length - 1,
      successRows: successCount,
      failedRows: failCount,
      importErrors: importErrors.slice(0, 100),
      message: `Import ${failCount === 0 ? 'completed successfully' : 'completed with errors'}. ${successCount} policies imported, ${failCount} failed.`
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/policies/import error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to import policies'
    }, { status: 500 });
  }
}
