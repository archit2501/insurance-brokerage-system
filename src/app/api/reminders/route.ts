import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reminders, notes, clients, policies } from '@/db/schema';
import { eq, and, or, inArray, desc, asc, gt, lt, gte, lte, sql } from 'drizzle-orm';

const VALID_TYPES = ['RemitPremium', 'VATOnCommission'];
const VALID_STATUSES = ['Pending', 'Completed', 'Overdue'];

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

function isPastDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const dueBefore = searchParams.get('due_before');
    const type = searchParams.get('type');

    // Auto-update overdue reminders
    const today = new Date().toISOString().split('T')[0];
    await db.update(reminders)
      .set({ status: 'Overdue', updatedAt: new Date().toISOString() })
      .where(and(
        eq(reminders.status, 'Pending'),
        lt(reminders.dueDate, today)
      ));

    let query = db.select({
      id: reminders.id,
      noteId: reminders.noteId,
      type: reminders.type,
      dueDate: reminders.dueDate,
      status: reminders.status,
      completedAt: reminders.completedAt,
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      note: {
        id: notes.id,
        noteId: notes.noteId,
        noteType: notes.noteType,
        clientId: notes.clientId,
        policyId: notes.policyId,
        grossPremium: notes.grossPremium,
        netAmountDue: notes.netAmountDue,
        status: notes.status
      },
      client: {
        id: clients.id,
        companyName: clients.companyName,
        cacRcNumber: clients.cacRcNumber
      },
      policy: {
        id: policies.id,
        policyNumber: policies.policyNumber,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium
      }
    })
    .from(reminders)
    .leftJoin(notes, eq(reminders.noteId, notes.id))
    .leftJoin(clients, eq(notes.clientId, clients.id))
    .leftJoin(policies, eq(notes.policyId, policies.id));

    const conditions = [];

    if (status) {
      const statusArray = status.split(',').filter(s => VALID_STATUSES.includes(s));
      if (statusArray.length > 0) {
        conditions.push(inArray(reminders.status, statusArray));
      }
    }

    if (type) {
      const typeArray = type.split(',').filter(t => VALID_TYPES.includes(t));
      if (typeArray.length > 0) {
        conditions.push(inArray(reminders.type, typeArray));
      }
    }

    if (dueBefore && isValidDate(dueBefore)) {
      conditions.push(lte(reminders.dueDate, dueBefore));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query
      .orderBy(desc(reminders.dueDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, type, dueDate } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required', code: 'MISSING_NOTE_ID' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'type is required', code: 'MISSING_TYPE' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `type must be one of: ${VALID_TYPES.join(', ')}`, 
        code: 'INVALID_TYPE' 
      }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ error: 'dueDate is required', code: 'MISSING_DUE_DATE' }, { status: 400 });
    }

    if (!isValidDate(dueDate)) {
      return NextResponse.json({ error: 'dueDate must be in YYYY-MM-DD format', code: 'INVALID_DATE_FORMAT' }, { status: 400 });
    }

    // Validate noteId exists
    const noteExists = await db.select({ id: notes.id })
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1);

    if (noteExists.length === 0) {
      return NextResponse.json({ error: 'Note not found', code: 'NOTE_NOT_FOUND' }, { status: 404 });
    }

    const status = isPastDate(dueDate) ? 'Overdue' : 'Pending';

    const newReminder = await db.insert(reminders)
      .values({
        noteId,
        type,
        dueDate,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newReminder[0], { status: 201 });
  } catch (error) {
    console.error('POST reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Valid ID is required', code: 'INVALID_ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, dueDate, type } = body;

    const existing = await db.select()
      .from(reminders)
      .where(eq(reminders.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Reminder not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`, 
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      updates.status = status;
      if (status === 'Completed') {
        updates.completedAt = new Date().toISOString();
      } else {
        updates.completedAt = null;
      }
    }

    if (dueDate !== undefined) {
      if (!isValidDate(dueDate)) {
        return NextResponse.json({ error: 'dueDate must be in YYYY-MM-DD format', code: 'INVALID_DATE_FORMAT' }, { status: 400 });
      }
      updates.dueDate = dueDate;
      if (!status && isPastDate(dueDate)) {
        updates.status = 'Overdue';
      }
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ 
          error: `type must be one of: ${VALID_TYPES.join(', ')}`, 
          code: 'INVALID_TYPE' 
        }, { status: 400 });
      }
      updates.type = type;
    }

    const updated = await db.update(reminders)
      .set(updates)
      .where(eq(reminders.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Valid ID is required', code: 'INVALID_ID' }, { status: 400 });
    }

    const deleted = await db.delete(reminders)
      .where(eq(reminders.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Reminder not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Reminder deleted successfully',
      deleted: deleted[0]
    });
  } catch (error) {
    console.error('DELETE reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}