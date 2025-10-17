import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reminders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid reminder ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const reminderId = parseInt(id);

    const existingReminders = await db.select()
      .from(reminders)
      .where(eq(reminders.id, reminderId))
      .limit(1);

    if (existingReminders.length === 0) {
      return NextResponse.json({ 
        error: 'Reminder not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const reminder = existingReminders[0];

    if (reminder.status !== 'Pending' && reminder.status !== 'Overdue') {
      return NextResponse.json({ 
        error: 'Reminder can only be completed when status is Pending or Overdue',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    const updatedReminder = await db.update(reminders)
      .set({
        status: 'Completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    if (updatedReminder.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update reminder',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json(updatedReminder[0], { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}