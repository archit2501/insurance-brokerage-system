import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentKycFiles, agents, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { existsSync } from 'fs';

const ALLOWED_FILE_TYPES = ['passport', 'id', 'cac', 'tin', 'other'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const role = request.headers.get('x-role') || 'Viewer';
  const userId = request.headers.get('x-user-id');
  return { id: userId ? parseInt(userId) : 1, role };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const agentId = parseInt(params.id);

    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Valid agent ID is required' }, { status: 400 });
    }

    // Check if agent exists
    const agent = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const kycFiles = await db.select()
      .from(agentKycFiles)
      .where(eq(agentKycFiles.agentId, agentId))
      .orderBy(agentKycFiles.createdAt);

    return NextResponse.json(kycFiles);
  } catch (error) {
    console.error('GET agent KYC files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role for upload
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin role required for file upload' }, { status: 403 });
    }

    const agentId = parseInt(params.id);

    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Valid agent ID is required' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    // Check if agent exists
    const agent = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type
    if (!fileType || !ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Valid file type is required',
        allowedTypes: ALLOWED_FILE_TYPES 
      }, { status: 400 });
    }

    // For corporate agents, CAC and TIN types must be allowed
    if (agent[0].type === 'corporate' && !['cac', 'tin'].includes(fileType)) {
      return NextResponse.json({ 
        error: 'For corporate agents, file type must be CAC or TIN',
        allowedTypes: ['cac', 'tin'] 
      }, { status: 400 });
    }

    // Get file buffer and calculate hash
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = createHash('sha256').update(buffer).digest('hex');

    // Create directory and save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'agents', agentId);
    const fileId = Date.now();
    const fileName = `${fileId}-${file.name}`;
    const relativeFilePath = path.join('uploads', 'agents', agentId, fileName);

    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Save to database
    const newKycFile = await db.insert(agentKycFiles)
      .values({
        agentId: agentId,
        fileName: file.name,
        fileType: fileType,
        filePath: relativeFilePath,
        fileSize: file.size,
        sha256Hash: hash,
        uploadedBy: user.id,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({
      ...newKycFile[0],
      fileUrl: `/${relativeFilePath.replace(/\\/g, '/')}`
    }, { status: 201 });
  } catch (error) {
    console.error('POST agent KYC file error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}