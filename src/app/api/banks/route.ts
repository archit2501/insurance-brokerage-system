import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bankAccounts, auditLogs } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { nextEntityCode } from '../_lib/sequences';
import { authenticateRequest } from '@/app/api/_lib/auth';

function validateNUBAN(accountNumber: string): boolean {
  if (accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) return false;
  
  // UAT bypass: Allow any 10-digit number for testing
  // TODO: For production, remove this bypass and enforce checksum
  return true;
  
  // Production NUBAN checksum validation (disabled for UAT):
  // const weights = [3, 7, 3, 3, 7, 3, 3, 7, 3];
  // let sum = 0;
  // for (let i = 0; i < 9; i++) {
  //   sum += parseInt(accountNumber[i]) * weights[i];
  // }
  // const remainder = sum % 10;
  // const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  // return parseInt(accountNumber[9]) === checkDigit;
}

function validateIBAN(iban: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Check basic format (15-34 alphanumeric characters)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/.test(cleanIban) || cleanIban.length < 15 || cleanIban.length > 34) {
    return false;
  }
  
  // Move first 4 characters to end
  const rearranged = cleanIban.substring(4) + cleanIban.substring(0, 4);
  
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else if (char >= '0' && char <= '9') {
      numericString += char;
    } else {
      return false;
    }
  }
  
  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numericString.length; i++) {
    remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
  }
  
  return remainder === 1;
}

function validateSWIFTBIC(swiftBic: string): boolean {
  const pattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return pattern.test(swiftBic) && [8, 11].includes(swiftBic.length);
}

function validateCurrency(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}

function validateCountryCode(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const searchParams = request.nextUrl.searchParams;
    const ownerType = searchParams.get('owner_type');
    const ownerId = searchParams.get('owner_id');
    const active = searchParams.get('active');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let query = db.select().from(bankAccounts);

    const conditions = [];
    
    if (ownerType) {
      conditions.push(eq(bankAccounts.ownerType, ownerType));
    }
    
    if (ownerId) {
      const ownerIdNum = parseInt(ownerId);
      if (isNaN(ownerIdNum)) {
        return NextResponse.json({ 
          error: "Invalid owner_id parameter",
          code: "INVALID_OWNER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(bankAccounts.ownerId, ownerIdNum));
    }
    
    if (active !== null) {
      const isActive = active === 'true';
      conditions.push(eq(bankAccounts.active, isActive));
    }

    if (search) {
      conditions.push(
        or(
          like(bankAccounts.bankName, `%${search}%`),
          like(bankAccounts.accountNumber, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(bankAccounts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET bank accounts error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    
    const {
      ownerType,
      ownerId,
      bankName,
      branch,
      accountNumber,
      accountCountry = 'NG',
      currency = 'NGN',
      swiftBic,
      usageReceivable = false,
      usagePayable = false,
      isDefault = false,
      statementSource = 'Manual',
      glCode
    } = body;

    // UAT: Allow any country/currency for testing
    // TODO: For production, uncomment below to enforce Nigeria-only rule
    // if (accountCountry !== 'NG' || currency !== 'NGN') {
    //   return NextResponse.json({
    //     error: 'Only Nigerian bank accounts in NGN are allowed per policy',
    //     code: 'NIGERIA_ONLY'
    //   }, { status: 400 });
    // }

    // UAT: Allow SWIFT/BIC for testing international scenarios
    // TODO: For production, uncomment below to disallow foreign transfers
    // if (swiftBic && String(swiftBic).trim().length > 0) {
    //   return NextResponse.json({
    //     error: 'SWIFT/BIC is not allowed for premium collections (NG/NGN only)',
    //     code: 'SWIFT_NOT_ALLOWED'
    //   }, { status: 400 });
    // }

    // Security: Reject if bank_code or bankCode provided in request body
    if ('bank_code' in body || 'bankCode' in body) {
      return NextResponse.json({ 
        error: "Bank code is auto-generated and cannot be provided in request body",
        code: "BANK_CODE_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!ownerType || !ownerId || !bankName || !accountNumber) {
      return NextResponse.json({ 
        error: "Missing required fields: ownerType, ownerId, bankName, accountNumber",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    // Validate owner type
    if (!['Client', 'Insurer', 'Agent'].includes(ownerType)) {
      return NextResponse.json({ 
        error: "ownerType must be 'Client', 'Insurer', or 'Agent'",
        code: "INVALID_OWNER_TYPE" 
      }, { status: 400 });
    }

    // Validate owner ID
    const ownerIdNum = parseInt(ownerId);
    if (isNaN(ownerIdNum) || ownerIdNum <= 0) {
      return NextResponse.json({ 
        error: "ownerId must be a positive integer",
        code: "INVALID_OWNER_ID" 
      }, { status: 400 });
    }

    // Validate bank name
    const trimmedBankName = bankName.trim();
    if (trimmedBankName.length < 2 || trimmedBankName.length > 100) {
      return NextResponse.json({ 
        error: "bankName must be 2-100 characters",
        code: "INVALID_BANK_NAME" 
      }, { status: 400 });
    }

    // Validate account number
    const trimmedAccountNumber = accountNumber.trim();
    if (!trimmedAccountNumber) {
      return NextResponse.json({ 
        error: "accountNumber is required",
        code: "MISSING_ACCOUNT_NUMBER" 
      }, { status: 400 });
    }

    // Validate usage flags
    if (!usageReceivable && !usagePayable) {
      return NextResponse.json({ 
        error: "At least one of usageReceivable or usagePayable must be true",
        code: "INVALID_USAGE_FLAGS" 
      }, { status: 400 });
    }

    // Validate account number format based on country
    // For NG: NUBAN validation (relaxed for UAT)
    // For other countries: Allow any format for UAT
    if (accountCountry === 'NG') {
      if (!validateNUBAN(trimmedAccountNumber)) {
        return NextResponse.json({ 
          error: "Invalid Nigerian bank account number (must be 10-digit NUBAN)",
          code: "INVALID_NUBAN" 
        }, { status: 400 });
      }
    } else {
      // For non-NG accounts, just check basic length
      if (trimmedAccountNumber.length < 8 || trimmedAccountNumber.length > 34) {
        return NextResponse.json({ 
          error: "Account number must be 8-34 characters",
          code: "INVALID_ACCOUNT_NUMBER" 
        }, { status: 400 });
      }
    }

    // Check for duplicate account (adjusted for multi-country support)
    const existingAccount = await db.select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.ownerType, ownerType),
          eq(bankAccounts.ownerId, ownerIdNum),
          eq(bankAccounts.accountNumber, trimmedAccountNumber),
          eq(bankAccounts.accountCountry, accountCountry || 'NG')
        )
      )
      .limit(1);

    if (existingAccount.length > 0) {
      return NextResponse.json({ 
        error: "Bank account already exists for this owner",
        code: "DUPLICATE_ACCOUNT" 
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const userIdHeader = request.headers.get('x-user-id');
    const actorId = userIdHeader ? parseInt(userIdHeader) : null;
    
    // Handle default account logic before creating
    if (isDefault) {
      // Unset existing defaults for same owner and usage type
      if (usageReceivable) {
        await db.update(bankAccounts)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(bankAccounts.ownerType, ownerType),
              eq(bankAccounts.ownerId, ownerIdNum),
              eq(bankAccounts.usageReceivable, true),
              eq(bankAccounts.isDefault, true)
            )
          );
      }
      
      if (usagePayable) {
        await db.update(bankAccounts)
          .set({ isDefault: false, updatedAt: now })
          .where(
            and(
              eq(bankAccounts.ownerType, ownerType),
              eq(bankAccounts.ownerId, ownerIdNum),
              eq(bankAccounts.usagePayable, true),
              eq(bankAccounts.isDefault, true)
            )
          );
      }
    }

    // Generate bank code using centralized service
    const { code: bankCode } = await nextEntityCode(db, { 
      entity: 'BANK'
    });

    // Create new bank account
    const newAccount = await db.insert(bankAccounts)
      .values({
        bankCode,
        ownerType,
        ownerId: ownerIdNum,
        bankName: trimmedBankName,
        branch: branch?.trim() || null,
        accountNumber: trimmedAccountNumber,
        accountCountry: 'NG',
        currency: 'NGN',
        swiftBic: null, // SWIFT removed for NG-only setup
        usageReceivable,
        usagePayable,
        isDefault,
        statementSource,
        glCode: glCode?.trim() || null,
        active: true,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Audit log
    if (actorId) {
      await db.insert(auditLogs).values({
        tableName: 'bank_accounts',
        recordId: newAccount[0].id,
        action: 'CREATE',
        oldValues: null,
        newValues: newAccount[0],
        userId: actorId,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        createdAt: now
      });
    }

    return NextResponse.json(newAccount[0], { status: 201 });
  } catch (error) {
    console.error('POST bank account error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}