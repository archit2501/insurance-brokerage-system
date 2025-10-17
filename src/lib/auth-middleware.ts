import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Role definitions
export const VALID_ROLES = {
  ADMIN: 'Admin',
  UNDERWRITER: 'Underwriter',
  ACCOUNTS: 'Accounts',
  CLAIMS: 'Claims',
  MARKETER: 'Marketer',
  VIEWER: 'Viewer'
} as const;

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  [VALID_ROLES.ADMIN]: 100,
  [VALID_ROLES.UNDERWRITER]: 80,
  [VALID_ROLES.ACCOUNTS]: 70,
  [VALID_ROLES.CLAIMS]: 60,
  [VALID_ROLES.MARKETER]: 50,
  [VALID_ROLES.VIEWER]: 10
} as const;

export type UserRole = typeof VALID_ROLES[keyof typeof VALID_ROLES];

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  approvalLevel?: string;
}

/**
 * Validates Better-auth session token from Authorization header
 * Returns user data if valid, null if invalid
 */
export async function validateSession(request: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7).trim();
  
  if (!token) {
    return null;
  }

  try {
    // Validate session using Better-auth
    const session = await auth.api.getSession({
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    if (!session || !session.user) {
      return null;
    }

    // Fetch full user details from database
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (userRecord.length === 0) {
      return null;
    }

    const user = userRecord[0];

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.fullName,
      role: (user.role as UserRole) || VALID_ROLES.VIEWER,
      approvalLevel: user.approvalLevel || undefined
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Returns user if authenticated, otherwise returns 401 response
 */
export async function requireAuth(request: NextRequest): Promise<
  { user: AuthenticatedUser } | { error: NextResponse }
> {
  const user = await validateSession(request);
  
  if (!user) {
    return {
      error: NextResponse.json(
        { 
          error: 'Authentication required. Please log in.',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    };
  }

  return { user };
}

/**
 * Middleware to require specific role
 */
export async function requireRole(request: NextRequest, requiredRole: UserRole): Promise<
  { user: AuthenticatedUser } | { error: NextResponse }
> {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return authResult;
  }

  const userLevel = ROLE_HIERARCHY[authResult.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    return {
      error: NextResponse.json(
        { 
          error: `Insufficient permissions. Required role: ${requiredRole}`,
          code: 'FORBIDDEN'
        },
        { status: 403 }
      )
    };
  }

  return authResult;
}

/**
 * Middleware to require minimum approval level
 */
export async function requireApprovalLevel(request: NextRequest, minLevel: number): Promise<
  { user: AuthenticatedUser } | { error: NextResponse }
> {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return authResult;
  }

  const userApprovalLevel = authResult.user.approvalLevel || 'L1';
  const levelMap: Record<string, number> = {
    'L1': 1,
    'L2': 2,
    'L3': 3
  };

  const userLevel = levelMap[userApprovalLevel] || 0;

  if (userLevel < minLevel) {
    return {
      error: NextResponse.json(
        { 
          error: `Insufficient approval permissions. Required level: L${minLevel}`,
          code: 'FORBIDDEN'
        },
        { status: 403 }
      )
    };
  }

  return authResult;
}