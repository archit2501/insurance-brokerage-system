import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { insurerEmails, insurers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_ROLES = ['underwriter', 'marketer', 'MD', 'ED', 'DGM', 'Head_of_RI', 'claims', 'technical'] as const;
type RoleType = typeof VALID_ROLES[number];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const insurerId = searchParams.get('insurerId');

    if (!insurerId || isNaN(parseInt(insurerId))) {
      return NextResponse.json({ 
        error: "Valid insurerId is required",
        code: "INVALID_INSURER_ID"
      }, { status: 400 });
    }

    // Check if insurer exists
    const insurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(insurerId)))
      .limit(1);

    if (insurer.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: "INSURER_NOT_FOUND"
      }, { status: 404 });
    }

    const emailContacts = await db.select()
      .from(insurerEmails)
      .where(eq(insurerEmails.insurerId, parseInt(insurerId)))
      .orderBy(insurerEmails.createdAt);

    return NextResponse.json(emailContacts);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const insurerId = searchParams.get('insurerId');

    if (!insurerId || isNaN(parseInt(insurerId))) {
      return NextResponse.json({ 
        error: "Valid insurerId is required",
        code: "INVALID_INSURER_ID"
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { role, email } = requestBody;

    // Validate required fields
    if (!role || typeof role !== 'string') {
      return NextResponse.json({ 
        error: "role is required and must be a string",
        code: "MISSING_ROLE" 
      }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ 
        error: "email is required and must be a string",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    // Validate role
    if (!VALID_ROLES.includes(role as RoleType)) {
      return NextResponse.json({ 
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
        code: "INVALID_ROLE"
      }, { status: 400 });
    }

    // Check if insurer exists
    const insurer = await db.select()
      .from(insurers)
      .where(eq(insurers.id, parseInt(insurerId)))
      .limit(1);

    if (insurer.length === 0) {
      return NextResponse.json({ 
        error: 'Insurer not found',
        code: "INSURER_NOT_FOUND"
      }, { status: 404 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT"
      }, { status: 400 });
    }

    // Check for duplicate insurer+role+email combination
    const existingEmail = await db.select()
      .from(insurerEmails)
      .where(and(
        eq(insurerEmails.insurerId, parseInt(insurerId)),
        eq(insurerEmails.role, role),
        eq(insurerEmails.email, email.trim().toLowerCase())
      ))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({ 
        error: "Email contact already exists for this insurer and role",
        code: "DUPLICATE_EMAIL_CONTACT"
      }, { status: 400 });
    }

    const newEmailContact = await db.insert(insurerEmails)
      .values({
        insurerId: parseInt(insurerId),
        role: role.trim(),
        email: email.trim().toLowerCase(),
        active: true,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newEmailContact[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const deleted = await db.delete(insurerEmails)
      .where(eq(insurerEmails.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Email contact not found',
        code: "EMAIL_CONTACT_NOT_FOUND"
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Email contact deleted successfully',
      deleted: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}