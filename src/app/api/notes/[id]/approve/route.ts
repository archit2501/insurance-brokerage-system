import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { requireApprovalLevel } from '@/app/api/_lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce approval level >= L2 via header-based RBAC helper
    const approvalCheck = await requireApprovalLevel(request, 2);
    if (!approvalCheck.success) return approvalCheck.response;

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('DEBUG APPROVE - user:', user);

    const { id } = await params;
    const noteId = id;

    if (!noteId || isNaN(parseInt(noteId))) {
      return NextResponse.json({ 
        error: 'Valid note ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Load note by id (do not restrict to creator)
    const noteResult = await db
      .select()
      .from(notes)
      .where(eq(notes.id, parseInt(noteId)))
      .limit(1);

    if (noteResult.length === 0) {
      return NextResponse.json({ 
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      }, { status: 404 });
    }

    const note = noteResult[0];

    // Validate note status is 'Draft'
    if (note.status !== 'Draft') {
      return NextResponse.json({ 
        error: 'Note must be in Draft status to approve',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Look up user by email to get integer ID
    let authorizedBy: number | null = null;
    const userEmail = user.email;
    console.log('DEBUG APPROVE - user email:', userEmail);

    if (userEmail) {
      const userResult = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (userResult.length > 0) {
        authorizedBy = userResult[0].id;
        console.log('DEBUG APPROVE - Found user by email, authorizedBy set to:', authorizedBy);
      } else {
        console.log('DEBUG APPROVE - No user found with email:', userEmail);
      }
    } else {
      console.log('DEBUG APPROVE - No email in user object');
    }

    const updatedNotes = await db
      .update(notes)
      .set({
        status: 'Approved',
        authorizedBy: authorizedBy,
        updatedAt: new Date().toISOString()
      })
      .where(eq(notes.id, parseInt(noteId)))
      .returning();

    if (updatedNotes.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update note',
        code: 'UPDATE_FAILED'
      }, { status: 404 });
    }

    return NextResponse.json(updatedNotes[0], { status: 200 });

  } catch (error) {
    console.error('Note approval error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}