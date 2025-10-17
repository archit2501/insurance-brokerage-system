import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';

// Agent validation utilities
export function isValidPhone(phone: string): boolean {
  // E.164 format validation: /^\+?[1-9]\d{7,14}$/
  return /^\+?[1-9]\d{7,14}$/.test(phone);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidAgentType(type: string): boolean {
  return ['individual', 'corporate'].includes(type);
}

export function isValidCommissionModel(model: string): boolean {
  return ['flat', 'variable'].includes(model);
}

export function isValidStatus(status: string): boolean {
  return ['active', 'inactive'].includes(status);
}

export function isValidCommissionPct(pct: number): boolean {
  return pct >= 0 && pct <= 100;
}

export function getCurrentUser(request: Request) {
  // Simple bearer token check - just verify presence
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  // For this implementation, just return a mock user if token exists
  return { id: 1, role: 'admin' };
}