import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentContacts, agents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

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
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_AGENT_ID' },
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

    // Get all contacts for this agent
    const contacts = await db.select()
      .from(agentContacts)
      .where(eq(agentContacts.agentId, agentId))
      .orderBy(agentContacts.id);

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('GET agent contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // UAT: Allow all authenticated users to add contacts
    // TODO: For production, uncomment below to restrict to Admin only
    // if (user.role !== 'Admin') {
    //   return NextResponse.json(
    //     { error: 'Admin role required', code: 'INSUFFICIENT_PERMISSIONS' },
    //     { status: 403 }
    //   );
    // }

    const agentId = parseInt(params.id);
    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_AGENT_ID' },
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

    const body = await request.json();

    // Security: Check for user ID fields in request body
    if ('userId' in body || 'user_id' in body || 'authorId' in body) {
      return NextResponse.json(
        { error: 'User ID cannot be provided in request body', code: 'USER_ID_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { fullName, designation, email, phone, isPrimary, status = 'active' } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Full name is required', code: 'MISSING_FULL_NAME' },
        { status: 400 }
      );
    }

    if (fullName.length > 100) {
      return NextResponse.json(
        { error: 'Full name must be 100 characters or less', code: 'FULL_NAME_TOO_LONG' },
        { status: 400 }
      );
    }

    // Validate designation if provided
    if (designation !== undefined && designation !== null) {
      if (typeof designation !== 'string') {
        return NextResponse.json(
          { error: 'Designation must be a string', code: 'INVALID_DESIGNATION' },
          { status: 400 }
        );
      }
      if (designation.length > 100) {
        return NextResponse.json(
          { error: 'Designation must be 100 characters or less', code: 'DESIGNATION_TOO_LONG' },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (email !== undefined && email !== null) {
      if (typeof email !== 'string' || !isValidEmail(email)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      // Check for duplicate email for this agent
      const existingEmail = await db.select()
        .from(agentContacts)
        .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.email, email)))
        .limit(1);

      if (existingEmail.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists for this agent', code: 'DUPLICATE_EMAIL' },
          { status: 400 }
        );
      }
    }

    // Validate phone if provided
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string' || !isValidPhone(phone)) {
        return NextResponse.json(
          { error: 'Invalid phone format. Must be E.164 format (+123456789)', code: 'INVALID_PHONE' },
          { status: 400 }
        );
      }

      // Check for duplicate phone for this agent
      const existingPhone = await db.select()
        .from(agentContacts)
        .where(and(eq(agentContacts.agentId, agentId), eq(agentContacts.phone, phone)))
        .limit(1);

      if (existingPhone.length > 0) {
        return NextResponse.json(
          { error: 'Phone already exists for this agent', code: 'DUPLICATE_PHONE' },
          { status: 400 }
        );
      }
    }

    // Validate isPrimary
    const isPrimaryValue = isPrimary === true;

    // Start transaction for primary contact handling
    const now = new Date().toISOString();
    const insertData = {
      agentId,
      fullName: fullName.trim(),
      designation: designation?.trim() || null,
      email: email?.toLowerCase().trim() || null,
      phone: phone?.trim() || null,
      isPrimary: isPrimaryValue ? 1 : 0,
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    // If setting as primary, update other contacts first
    if (isPrimaryValue) {
      await db.update(agentContacts)
        .set({ isPrimary: 0, updatedAt: now })
        .where(eq(agentContacts.agentId, agentId));
    }

    // Create the new contact
    const newContact = await db.insert(agentContacts)
      .values(insertData)
      .returning();

    return NextResponse.json(newContact[0], { status: 201 });
  } catch (error) {
    console.error('POST agent contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}