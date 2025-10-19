import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filter parameters
    const tableName = searchParams.get('table_name');
    const action = searchParams.get('action');
    const userId = searchParams.get('user_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    
    let query = db.select({
      id: auditLogs.id,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      action: auditLogs.action,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      userId: auditLogs.userId,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role
      }
    }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));
    
    const conditions = [];
    
    // Table name filter
    if (tableName) {
      const tables = tableName.split(',');
      if (tables.length > 0) {
        conditions.push(inArray(auditLogs.tableName, tables));
      }
    }
    
    // Action filter
    if (action) {
      const actions = action.split(',');
      if (actions.length > 0) {
        conditions.push(inArray(auditLogs.action, actions));
      }
    }
    
    // User ID filter
    if (userId && !isNaN(parseInt(userId))) {
      conditions.push(eq(auditLogs.userId, parseInt(userId)));
    }
    
    // Date range filter
    if (fromDate) {
      const fromDateTime = new Date(fromDate).toISOString();
      conditions.push(gte(auditLogs.createdAt, fromDateTime));
    }
    
    if (toDate) {
      const toDateTime = new Date(toDate + 'T23:59:59.999Z').toISOString();
      conditions.push(lte(auditLogs.createdAt, toDateTime));
    }
    
    // Apply all conditions, ordering, and pagination in one go
    const results = conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset)
      : await query
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset);
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}