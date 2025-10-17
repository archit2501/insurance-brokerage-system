import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentKycFiles, agents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    // No auth required - open access
    const agentId = parseInt(params.id);
    const fileId = parseInt(params.fileId);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_AGENT_ID' },
        { status: 400 }
      );
    }

    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID', code: 'INVALID_FILE_ID' },
        { status: 400 }
      );
    }

    // Check if agent exists
    const agent = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if KYC file exists for this agent
    const kycFile = await db.select()
      .from(agentKycFiles)
      .where(and(eq(agentKycFiles.id, fileId), eq(agentKycFiles.agentId, agentId)))
      .limit(1);

    if (kycFile.length === 0) {
      return NextResponse.json(
        { error: 'KYC file not found', code: 'KYC_FILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Try to delete physical file (don't fail if file doesn't exist)
    try {
      const filePath = path.join(process.cwd(), 'public', kycFile[0].filePath);
      await unlink(filePath);
    } catch (err) {
      console.warn('Could not delete physical file:', err);
    }

    // Delete the database record
    await db.delete(agentKycFiles)
      .where(and(eq(agentKycFiles.id, fileId), eq(agentKycFiles.agentId, agentId)));

    return NextResponse.json({ message: 'KYC file deleted successfully' });
  } catch (error) {
    console.error('DELETE agent KYC file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}