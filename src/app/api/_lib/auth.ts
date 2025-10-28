import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// Role definitions
export const VALID_ROLES = {
  ADMIN: 'Admin',
  UNDERWRITER: 'Underwriter',
  ACCOUNTS: 'Accounts',
  CLAIMS: 'Claims',
  MARKETER: 'Marketer',
  VIEWER: 'Viewer'
} as const;

export const VALID_APPROVAL_LEVELS = {
  L1: 'L1',
  L2: 'L2',
  L3: 'L3'
} as const;

export const VALID_STATUSES = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DRAFT: 'Draft',
  PENDING: 'Pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  ACTIVE_LOB: 'active',
  INACTIVE_LOB: 'inactive'
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

// Validation schemas
const emailSchema = z.string().email().toLowerCase().trim();

const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/,
  {
    message: 'Phone number must be in E.164 format'
  }
);

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/, 'Password must contain at least one letter and one number');

// Authentication middleware - Updated to use better-auth sessions
export async function authenticateRequest(request: NextRequest): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session || !session.user) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Authentication required. Please login.',
          code: 'NO_AUTH_SESSION'
        }, { status: 401 })
      };
    }
    
    return { 
      success: true, 
      userId: session.user.id 
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      }, { status: 401 })
    };
  }
}

// Helper to safely convert user ID to integer for legacy tables
// UAT: Better-auth uses text IDs, but some tables still expect integer
// TODO: Migrate all createdBy/userId fields to text in production
export function safeParseUserId(userId: string): number | null {
  try {
    const parsedId = parseInt(userId);
    if (!isNaN(parsedId) && isFinite(parsedId)) {
      return parsedId;
    }
  } catch (e) {
    // Better-auth string ID, cannot convert
  }
  return null;
}

// Legacy token auth (deprecated - use authenticateRequest instead)
export function authenticateToken(request: NextRequest): { success: true } | { success: false; response: NextResponse } {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Authentication required',
        code: 'NO_AUTH_TOKEN'
      }, { status: 401 })
    };
  }
  
  const token = authHeader.substring(7).trim();
  
  if (!token) {
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Authentication token is required',
        code: 'EMPTY_AUTH_TOKEN'
      }, { status: 401 })
    };
  }
  
  return { success: true };
}

// Role extraction - Updated to use better-auth session
export async function getUserRole(request: NextRequest): Promise<string> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    // For now, default to VIEWER until role system is integrated with better-auth
    // TODO: Add role field to user table and session
    return VALID_ROLES.VIEWER;
  } catch (error) {
    return VALID_ROLES.VIEWER;
  }
}

// RBAC permission checking - Updated to use better-auth
export async function requireRole(request: NextRequest, requiredRole: string): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult;
  }
  
  const userRole = await getUserRole(request);
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
  
  if (userLevel < requiredLevel) {
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 })
    };
  }
  
  return { success: true, userId: authResult.userId };
}

// Approval level mapping and checks
const APPROVAL_LEVEL_MAP: Record<string, number> = {
  [VALID_APPROVAL_LEVELS.L1]: 1,
  [VALID_APPROVAL_LEVELS.L2]: 2,
  [VALID_APPROVAL_LEVELS.L3]: 3,
};

export function getApprovalLevel(request: NextRequest): number {
  const header = (request.headers.get('x-approval-level') || '').toUpperCase();
  return APPROVAL_LEVEL_MAP[header] ?? 0;
}

export async function requireApprovalLevel(request: NextRequest, minLevel: number): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  // Use modern better-auth session instead of legacy token
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult;

  const level = getApprovalLevel(request);
  if (level < minLevel) {
    return {
      success: false,
      response: NextResponse.json({
        error: 'Insufficient approval permissions',
        code: 'INSUFFICIENT_APPROVAL_LEVEL'
      }, { status: 403 })
    };
  }
  return { success: true, userId: authResult.userId };
}

// Validation utilities
export function validateEmail(email: string): { success: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid email format' };
  }
}

export function validatePhone(phone: string): { success: boolean; error?: string } {
  if (!phone) return { success: true }; // Phone is optional
  try {
    phoneSchema.parse(phone);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid phone format' };
  }
}

export function validatePassword(password: string): { success: boolean; error?: string } {
  try {
    passwordSchema.parse(password);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Invalid password format' };
  }
}

// Additional business ID/registration validators (best-effort until stricter doc patterns are provided)
export function validateTIN(tin: string): { success: boolean; error?: string } {
  const trimmed = (tin || '').trim();
  if (!/^[0-9]{8,12}$/.test(trimmed)) {
    return { success: false, error: 'TIN must be 8-12 digits' };
  }
  return { success: true };
}

export function validateCACOrRC(value: string): { success: boolean; error?: string } {
  const trimmed = (value || '').trim().toUpperCase();
  // Allow common CAC/RC formats (alphanumeric with optional "/" or "-")
  if (!/^[A-Z0-9\/\-]{6,20}$/.test(trimmed)) {
    return { success: false, error: 'CAC/RC format invalid (6-20 alphanumeric with optional / or -)' };
  }
  return { success: true };
}

export function validateNAICOM(license: string): { success: boolean; error?: string } {
  const trimmed = (license || '').trim().toUpperCase();
  if (!/^[A-Z0-9\/\-]{5,20}$/.test(trimmed)) {
    return { success: false, error: 'NAICOM license format invalid (5-20 alphanumeric with optional / or -)' };
  }
  return { success: true };
}

// Role validation
export function isValidRole(role: string): role is keyof typeof VALID_ROLES {
  return Object.values(VALID_ROLES).includes(role as any);
}

export function isValidApprovalLevel(approvalLevel: string): approvalLevel is keyof typeof VALID_APPROVAL_LEVELS {
  return Object.values(VALID_APPROVAL_LEVELS).includes(approvalLevel as any);
}

export function isValidStatus(status: string): status is keyof typeof VALID_STATUSES {
  return Object.values(VALID_STATUSES).includes(status as any);
}

// Export types
export type UserRole = typeof VALID_ROLES[keyof typeof VALID_ROLES];
export type ApprovalLevel = typeof VALID_APPROVAL_LEVELS[keyof typeof VALID_APPROVAL_LEVELS];
export type UserStatus = typeof VALID_STATUSES[keyof typeof VALID_STATUSES];