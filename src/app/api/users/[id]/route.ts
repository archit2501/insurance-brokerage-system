import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const ROLES = ['Admin', 'Underwriter', 'Accounts', 'Claims', 'Marketer', 'Viewer'];
const APPROVAL_LEVELS = ['L1', 'L2', 'L3'];
const STATUSES = ['Active', 'Inactive'];

// Simple auth functions for now
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const roleHeader = request.headers.get('x-role') || 'Viewer';
  
  return {
    id: 1,
    role: roleHeader
  };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const userRecord = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        approvalLevel: users.approvalLevel,
        tfaEnabled: users.tfaEnabled,
        status: users.status,
        maxOverrideLimit: users.maxOverrideLimit,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userRecord[0]);
  } catch (error) {
    console.error('GET user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await authenticateRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (currentUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      role,
      approvalLevel,
      status,
      maxOverrideLimit,
      tfaEnabled,
      password
    } = body;

    if ('email' in body || 'passwordHash' in body || 'userId' in body || 'user_id' in body || 'id' in body) {
      return NextResponse.json({ 
        error: 'Invalid fields provided', 
        code: 'INVALID_FIELDS' 
      }, { status: 400 });
    }

    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (fullName !== undefined) {
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Full name is required and must be a non-empty string', 
          code: 'INVALID_FULL_NAME' 
        }, { status: 400 });
      }
      updates.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      if (phone !== null && phone !== '') {
        if (!validatePhone(phone)) {
          return NextResponse.json({ 
            error: 'Phone must be in E.164 format', 
            code: 'INVALID_PHONE' 
          }, { status: 400 });
        }
        updates.phone = phone;
      } else {
        updates.phone = null;
      }
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return NextResponse.json({ 
          error: `Role must be one of: ${ROLES.join(', ')}`, 
          code: 'INVALID_ROLE' 
        }, { status: 400 });
      }
      updates.role = role;
    }

    if (approvalLevel !== undefined) {
      if (approvalLevel !== null && approvalLevel !== '') {
        if (!APPROVAL_LEVELS.includes(approvalLevel)) {
          return NextResponse.json({ 
            error: `Approval level must be one of: ${APPROVAL_LEVELS.join(', ')}`, 
            code: 'INVALID_APPROVAL_LEVEL' 
          }, { status: 400 });
        }
        updates.approvalLevel = approvalLevel;
      } else {
        updates.approvalLevel = null;
      }
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: `Status must be one of: ${STATUSES.join(', ')}`, 
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      updates.status = status;
    }

    if (maxOverrideLimit !== undefined) {
      const limit = parseFloat(maxOverrideLimit);
      if (isNaN(limit) || limit < 0) {
        return NextResponse.json({ 
          error: 'Max override limit must be a non-negative number', 
          code: 'INVALID_MAX_OVERRIDE' 
        }, { status: 400 });
      }
      updates.maxOverrideLimit = limit;
    }

    if (tfaEnabled !== undefined) {
      if (typeof tfaEnabled !== 'boolean') {
        return NextResponse.json({ 
          error: 'TFA enabled must be a boolean', 
          code: 'INVALID_TFA' 
        }, { status: 400 });
      }
      updates.tfaEnabled = tfaEnabled;
    }

    if (password !== undefined) {
      if (password !== null && password !== '') {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return NextResponse.json({ 
            error: passwordValidation.error, 
            code: 'INVALID_PASSWORD' 
          }, { status: 400 });
        }
        updates.passwordHash = await bcrypt.hash(password, 12);
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ 
        error: 'No valid fields to update', 
        code: 'NO_FIELDS_TO_UPDATE' 
      }, { status: 400 });
    }

    const updatedUser = await db
      .update(users)
      .set(updates)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        approvalLevel: users.approvalLevel,
        tfaEnabled: users.tfaEnabled,
        status: users.status,
        maxOverrideLimit: users.maxOverrideLimit,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    console.error('PUT user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await authenticateRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (currentUser.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db
      .update(users)
      .set({ 
        deletedAt: new Date().toISOString(),
        status: 'Inactive',
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}