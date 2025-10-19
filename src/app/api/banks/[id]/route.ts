import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bankAccounts, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, requireRole, VALID_ROLES, authenticateRequest } from '@/app/api/_lib/auth';

// Validation helpers
function isValidNuban(accountNumber: string, bankCode?: string): boolean {
  if (!/^\d{10}$/.test(accountNumber)) return false;
  if (bankCode) {
    const nuban = bankCode + accountNumber;
    return /^\d{16}$/.test(nuban);
  }
  return true;
}

function isValidIban(iban: string): boolean {
  const clean = iban.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{15,34}$/.test(clean);
}

// GET single bank account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const account = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, parseInt(id)))
      .limit(1);

    if (account.length === 0) {
      return NextResponse.json(
        { error: 'Bank account not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(account[0]);
  } catch (error) {
    console.error('GET bank account error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PUT update bank account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const { 
      bankName, 
      branch, 
      swiftBic, 
      usageReceivable, 
      usagePayable, 
      isDefault, 
      statementSource, 
      glCode, 
      active 
    } = body;

    // Validate required fields
    if (!bankName || typeof bankName !== 'string') {
      return NextResponse.json(
        { error: 'Valid bank name is required', code: 'MISSING_BANK_NAME' },
        { status: 400 }
      );
    }

    // Validate business rules
    const usageReceivableBool = Boolean(usageReceivable);
    const usagePayableBool = Boolean(usagePayable);
    
    if (!usageReceivableBool && !usagePayableBool) {
      return NextResponse.json(
        { error: 'Account must be usable for receivable or payable', code: 'INVALID_USAGE' },
        { status: 400 }
      );
    }

    // SWIFT/BIC not allowed per NG/NGN-only policy
    if (swiftBic && String(swiftBic).trim().length > 0) {
      return NextResponse.json(
        { error: 'SWIFT/BIC is not allowed for premium collections (NG/NGN only)', code: 'SWIFT_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    // Validate statement source
    const validSources = ['Manual', 'CSV', 'API'];
    const statementSourceValue = statementSource || 'Manual';
    if (!validSources.includes(statementSourceValue)) {
      return NextResponse.json(
        { error: 'Invalid statement source', code: 'INVALID_SOURCE' },
        { status: 400 }
      );
    }

    // Get current account details
    const currentAccount = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, parseInt(id)))
      .limit(1);

    if (currentAccount.length === 0) {
      return NextResponse.json(
        { error: 'Bank account not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const account = currentAccount[0];

    // Handle default account logic
    let finalIsDefault = Boolean(isDefault);
    if (finalIsDefault) {
      // Remove default status from other accounts for same owner
      await db
        .update(bankAccounts)
        .set({ isDefault: false })
        .where(
          and(
            eq(bankAccounts.ownerType, account.ownerType),
            eq(bankAccounts.ownerId, account.ownerId),
            eq(bankAccounts.usageReceivable, usageReceivableBool),
            eq(bankAccounts.usagePayable, usagePayableBool)
          )
        );
    }

    // Prepare update data
    const updateData = {
      bankName: bankName.trim(),
      branch: branch ? branch.trim() : null,
      swiftBic: null, // force null as SWIFT is not used for NG-only policy
      usageReceivable: usageReceivableBool,
      usagePayable: usagePayableBool,
      isDefault: finalIsDefault,
      statementSource: statementSourceValue,
      glCode: glCode ? glCode.trim() : null,
      active: active !== undefined ? Boolean(active) : account.active,
      updatedAt: new Date().toISOString()
    } as const;

    const updated = await db
      .update(bankAccounts)
      .set(updateData)
      .where(eq(bankAccounts.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Bank account not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Audit log for update
    const userIdHeader = request.headers.get('x-user-id');
    const actorId = userIdHeader ? parseInt(userIdHeader) : null;
    if (actorId) {
      await db.insert(auditLogs).values({
        tableName: 'bank_accounts',
        recordId: parseInt(id),
        action: 'UPDATE',
        oldValues: account,
        newValues: updated[0],
        userId: actorId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT bank account error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE bank account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const accountId = parseInt(id);

    // Load existing for audit
    const existing = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, accountId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Bank account not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const userIdHeader = request.headers.get('x-user-id');
    const actorId = userIdHeader ? parseInt(userIdHeader) : null;

    if (hardDelete) {
      // Hard delete
      const deleted = await db
        .delete(bankAccounts)
        .where(eq(bankAccounts.id, accountId))
        .returning();

      if (deleted.length === 0) {
        return NextResponse.json(
          { error: 'Bank account not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Audit log hard delete
      if (actorId) {
        await db.insert(auditLogs).values({
          tableName: 'bank_accounts',
          recordId: accountId,
          action: 'DELETE',
          oldValues: existing[0],
          newValues: null,
          userId: actorId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          createdAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        message: 'Bank account deleted permanently',
        account: deleted[0]
      });
    } else {
      // Soft delete - set active to false
      const updated = await db
        .update(bankAccounts)
        .set({ 
          active: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(bankAccounts.id, accountId))
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          { error: 'Bank account not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Audit log soft delete as UPDATE
      if (actorId) {
        await db.insert(auditLogs).values({
          tableName: 'bank_accounts',
          recordId: accountId,
          action: 'UPDATE',
          oldValues: existing[0],
          newValues: updated[0],
          userId: actorId,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          createdAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        message: 'Bank account deactivated successfully',
        account: updated[0]
      });
    }
  } catch (error) {
    console.error('DELETE bank account error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}