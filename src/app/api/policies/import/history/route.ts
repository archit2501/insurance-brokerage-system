import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { importBatches, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/policies/import/history
 * List all import batches
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build query
    let query = db
      .select({
        id: importBatches.id,
        batchNumber: importBatches.batchNumber,
        importType: importBatches.importType,
        fileName: importBatches.fileName,
        fileSize: importBatches.fileSize,
        totalRows: importBatches.totalRows,
        successRows: importBatches.successRows,
        failedRows: importBatches.failedRows,
        status: importBatches.status,
        validationErrors: importBatches.validationErrors,
        startedAt: importBatches.startedAt,
        completedAt: importBatches.completedAt,
        createdAt: importBatches.createdAt,
        importedBy: users.firstName,
        importedByEmail: users.email,
      })
      .from(importBatches)
      .leftJoin(users, eq(importBatches.importedBy, users.id))
      .orderBy(desc(importBatches.createdAt))
      .$dynamic();

    if (status) {
      query = query.where(eq(importBatches.status, status));
    }

    const batches = await query;

    // Parse validation errors and handle null user data
    const batchesWithErrors = batches.map(batch => {
      let parsedErrors = null;
      try {
        parsedErrors = batch.validationErrors ? JSON.parse(batch.validationErrors as string) : null;
      } catch (e) {
        console.error('Failed to parse validation errors:', e);
        parsedErrors = null;
      }

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        importType: batch.importType,
        fileName: batch.fileName,
        fileSize: batch.fileSize,
        totalRows: batch.totalRows,
        successRows: batch.successRows,
        failedRows: batch.failedRows,
        status: batch.status,
        validationErrors: parsedErrors,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
        importedBy: batch.importedBy || 'Unknown',
        importedByEmail: batch.importedByEmail || '',
        duration: batch.startedAt && batch.completedAt 
          ? Math.round((new Date(batch.completedAt).getTime() - new Date(batch.startedAt).getTime()) / 1000)
          : null,
      };
    });

    return NextResponse.json({
      batches: batchesWithErrors,
      count: batchesWithErrors.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('GET /api/policies/import/history error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch import history'
    }, { status: 500 });
  }
}
