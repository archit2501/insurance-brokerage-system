import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kycFiles, clients, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const ALLOWED_FILE_TYPES = ['CAC', 'TIN', 'AUDITED_ACCOUNTS', 'OTHER'] as const;
type FileType = typeof ALLOWED_FILE_TYPES[number];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ 
        error: 'Valid clientId is required',
        code: 'INVALID_CLIENT_ID'
      }, { status: 400 });
    }

    // Validate client exists
    const client = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(clientId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Get all KYC files for this client
    const kycRecords = await db.select()
      .from(kycFiles)
      .where(eq(kycFiles.clientId, parseInt(clientId)));

    return NextResponse.json(kycRecords);
  } catch (error) {
    console.error('GET KYC files error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.fileName || typeof body.fileName !== 'string' || body.fileName.trim() === '') {
      return NextResponse.json({ 
        error: 'fileName is required and must be a non-empty string',
        code: 'MISSING_FILE_NAME'
      }, { status: 400 });
    }

    if (!body.fileType || typeof body.fileType !== 'string') {
      return NextResponse.json({ 
        error: 'fileType is required and must be a string',
        code: 'MISSING_FILE_TYPE'
      }, { status: 400 });
    }

    if (!body.filePath || typeof body.filePath !== 'string' || body.filePath.trim() === '') {
      return NextResponse.json({ 
        error: 'filePath is required and must be a non-empty string',
        code: 'MISSING_FILE_PATH'
      }, { status: 400 });
    }

    if (body.fileSize === undefined || body.fileSize === null) {
      return NextResponse.json({ 
        error: 'fileSize is required',
        code: 'MISSING_FILE_SIZE'
      }, { status: 400 });
    }

    if (!body.sha256Hash || typeof body.sha256Hash !== 'string' || body.sha256Hash.trim() === '') {
      return NextResponse.json({ 
        error: 'sha256Hash is required and must be a non-empty string',
        code: 'MISSING_SHA256_HASH'
      }, { status: 400 });
    }

    // Validate fileType
    if (!ALLOWED_FILE_TYPES.includes(body.fileType as FileType)) {
      return NextResponse.json({ 
        error: `fileType must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      }, { status: 400 });
    }

    // Validate clientId
    if (!body.clientId || isNaN(parseInt(body.clientId))) {
      return NextResponse.json({ 
        error: 'clientId is required and must be a valid number',
        code: 'INVALID_CLIENT_ID'
      }, { status: 400 });
    }

    // Validate client exists
    const client = await db.select()
      .from(clients)
      .where(eq(clients.id, parseInt(body.clientId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Get uploadedBy from header if present
    const uploadedByHeader = request.headers.get('x-user-id');
    let uploadedBy = null;
    
    if (uploadedByHeader) {
      const userId = parseInt(uploadedByHeader);
      if (!isNaN(userId)) {
        // Validate user exists
        const user = await db.select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user.length > 0) {
          uploadedBy = userId;
        }
      }
    }

    // Create KYC file record
    const newKycFile = await db.insert(kycFiles)
      .values({
        clientId: parseInt(body.clientId),
        fileName: body.fileName.trim(),
        fileType: body.fileType as FileType,
        filePath: body.filePath.trim(),
        fileSize: parseInt(body.fileSize) || null,
        sha256Hash: body.sha256Hash.trim(),
        uploadedBy: uploadedBy,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newKycFile[0], { status: 201 });
  } catch (error) {
    console.error('POST KYC file error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}