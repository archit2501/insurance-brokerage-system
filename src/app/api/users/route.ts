import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, like, and, or, desc, asc, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const ROLES = ['Admin', 'Underwriter', 'Accounts', 'Claims', 'Marketer', 'Viewer'] as const;
const APPROVAL_LEVELS = ['L1', 'L2', 'L3'] as const;
const STATUSES = ['Active', 'Inactive'] as const;

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

async function requireAuth(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return user;
}

async function requireAdmin(request: NextRequest) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (user.role !== 'Admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
  }
  return user;
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [isNull(users.deletedAt)];

    if (role) {
      if (!ROLES.includes(role as any)) {
        return NextResponse.json({ 
          error: 'Invalid role value',
          code: 'INVALID_ROLE'
        }, { status: 400 });
      }
      conditions.push(eq(users.role, role));
    }

    if (status) {
      const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (!STATUSES.includes(normalizedStatus as any)) {
        return NextResponse.json({ 
          error: 'Invalid status value',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(users.status, normalizedStatus));
    }

    if (search) {
      const searchCondition = or(
        like(users.fullName, `%${search}%`),
        like(users.email, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Execute query
    const results = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        approvalLevel: users.approvalLevel,
        status: users.status,
        maxOverrideLimit: users.maxOverrideLimit,
        tfaEnabled: users.tfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      role,
      approvalLevel,
      password,
      status,
      maxOverrideLimit,
      tfaEnabled
    } = body;

    // Validate required fields
    if (!fullName || !email || !role || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check email uniqueness
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      }, { status: 400 });
    }

    // Validate role
    if (!ROLES.includes(role as any)) {
      return NextResponse.json({ 
        error: 'Invalid role',
        code: 'INVALID_ROLE'
      }, { status: 400 });
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      return NextResponse.json({ 
        error: 'Phone must be in E.164 format',
        code: 'INVALID_PHONE'
      }, { status: 400 });
    }

    // Validate approvalLevel if provided
    if (approvalLevel && !APPROVAL_LEVELS.includes(approvalLevel as any)) {
      return NextResponse.json({ 
        error: 'Invalid approval level',
        code: 'INVALID_APPROVAL_LEVEL'
      }, { status: 400 });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ 
        error: passwordValidation.error,
        code: 'INVALID_PASSWORD'
      }, { status: 400 });
    }

    // Set defaults
    const normalizedStatus = status ? 
      status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Active';
    if (!STATUSES.includes(normalizedStatus as any)) {
      return NextResponse.json({ 
        error: 'Invalid status value',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    const normalizedMaxOverrideLimit = maxOverrideLimit ?? 0;
    if (normalizedMaxOverrideLimit < 0) {
      return NextResponse.json({ 
        error: 'maxOverrideLimit must be >= 0',
        code: 'INVALID_MAX_OVERRIDE_LIMIT'
      }, { status: 400 });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const now = new Date().toISOString();

    const newUser = await db
      .insert(users)
      .values({
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        role: role,
        approvalLevel: approvalLevel || null,
        passwordHash,
        status: normalizedStatus,
        maxOverrideLimit: normalizedMaxOverrideLimit,
        tfaEnabled: tfaEnabled ?? false,
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        approvalLevel: users.approvalLevel,
        status: users.status,
        maxOverrideLimit: users.maxOverrideLimit,
        tfaEnabled: users.tfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      role,
      approvalLevel,
      password,
      status,
      maxOverrideLimit,
      tfaEnabled
    } = body;

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (email !== undefined) {
      if (!validateEmail(email)) {
        return NextResponse.json({ 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }, { status: 400 });
      }
      const normalizedEmail = email.toLowerCase();
      
      // Check email uniqueness (excluding current user)
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, normalizedEmail), eq(users.id, parseInt(id))))
        .limit(1);
      
      if (existingUser.length === 0) {
        const emailExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);
        
        if (emailExists.length > 0) {
          return NextResponse.json({ 
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          }, { status: 400 });
        }
      }
      
      updates.email = normalizedEmail;
    }
    if (phone !== undefined) {
      if (phone && !validatePhone(phone)) {
        return NextResponse.json({ 
          error: 'Phone must be in E.164 format',
          code: 'INVALID_PHONE'
        }, { status: 400 });
      }
      updates.phone = phone ? phone.trim() : null;
    }
    if (role !== undefined) {
      if (!ROLES.includes(role as any)) {
        return NextResponse.json({ 
          error: 'Invalid role',
          code: 'INVALID_ROLE'
        }, { status: 400 });
      }
      updates.role = role;
    }
    if (approvalLevel !== undefined) {
      if (approvalLevel && !APPROVAL_LEVELS.includes(approvalLevel as any)) {
        return NextResponse.json({ 
          error: 'Invalid approval level',
          code: 'INVALID_APPROVAL_LEVEL'
        }, { status: 400 });
      }
      updates.approvalLevel = approvalLevel;
    }
    if (password !== undefined) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return NextResponse.json({ 
          error: passwordValidation.error,
          code: 'INVALID_PASSWORD'
        }, { status: 400 });
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }
    if (status !== undefined) {
      const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (!STATUSES.includes(normalizedStatus as any)) {
        return NextResponse.json({ 
          error: 'Invalid status value',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = normalizedStatus;
    }
    if (maxOverrideLimit !== undefined) {
      if (maxOverrideLimit < 0) {
        return NextResponse.json({ 
          error: 'maxOverrideLimit must be >= 0',
          code: 'INVALID_MAX_OVERRIDE_LIMIT'
        }, { status: 400 });
      }
      updates.maxOverrideLimit = maxOverrideLimit;
    }
    if (tfaEnabled !== undefined) {
      updates.tfaEnabled = tfaEnabled;
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    const updatedUser = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        approvalLevel: users.approvalLevel,
        status: users.status,
        maxOverrideLimit: users.maxOverrideLimit,
        tfaEnabled: users.tfaEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });

    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    console.error('PUT /api/users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Perform soft delete by setting deletedAt timestamp
    const deletedUser = await db
      .update(users)
      .set({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        deletedAt: users.deletedAt
      });

    if (deletedUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'User deleted successfully',
      user: deletedUser[0]
    });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}