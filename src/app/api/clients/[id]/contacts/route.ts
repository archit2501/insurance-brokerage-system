import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts, clients } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { authenticateToken, requireRole, VALID_ROLES, validateEmail, validatePhone } from '@/app/api/_lib/auth';

export async function GET(request: NextRequest) {
  // Require authentication for reading contacts
  const auth = authenticateToken(request);
  if (!auth.success) return auth.response;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  
  try {
    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ 
        error: "Valid client ID is required",
        code: "INVALID_CLIENT_ID"
      }, { status: 400 });
    }

    const clientIdInt = parseInt(clientId);

    const clientExists = await db.select()
      .from(clients)
      .where(eq(clients.id, clientIdInt))
      .limit(1);

    if (clientExists.length === 0) {
      return NextResponse.json({ 
        error: "Client not found",
        code: "CLIENT_NOT_FOUND"
      }, { status: 404 });
    }

    const clientContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.clientId, clientIdInt))
      .orderBy(contacts.id);

    return NextResponse.json(clientContacts);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require Underwriter or higher to create contacts
    const roleCheck = await requireRole(request, VALID_ROLES.UNDERWRITER);
    if (!roleCheck.success) return roleCheck.response;

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    
    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ 
        error: "Valid client ID is required",
        code: "INVALID_CLIENT_ID"
      }, { status: 400 });
    }

    const clientIdInt = parseInt(clientId);
    const body = await request.json();
    const { fullName, email, phone, designation } = body;

    if (!fullName || !email || !phone) {
      return NextResponse.json({ 
        error: "Required fields are missing: fullName, email, phone",
        code: "MISSING_REQUIRED_FIELDS"
      }, { status: 400 });
    }

    // Validate email & phone formats
    const emailCheck = validateEmail(email);
    if (!emailCheck.success) {
      return NextResponse.json({ error: emailCheck.error || 'Invalid email', code: 'INVALID_EMAIL' }, { status: 400 });
    }
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.success) {
      return NextResponse.json({ error: phoneCheck.error || 'Invalid phone', code: 'INVALID_PHONE' }, { status: 400 });
    }

    const clientExists = await db.select()
      .from(clients)
      .where(eq(clients.id, clientIdInt))
      .limit(1);

    if (clientExists.length === 0) {
      return NextResponse.json({ 
        error: "Client not found",
        code: "CLIENT_NOT_FOUND"
      }, { status: 404 });
    }

    const existingContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.clientId, clientIdInt));

    const isFirstContact = existingContacts.length === 0;

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPhone = phone.trim();
    const trimmedFullName = fullName.trim();

    const emailExists = await db.select()
      .from(contacts)
      .where(and(eq(contacts.clientId, clientIdInt), eq(contacts.email, trimmedEmail)))
      .limit(1);

    if (emailExists.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists for this client",
        code: "DUPLICATE_EMAIL"
      }, { status: 400 });
    }

    const phoneExists = await db.select()
      .from(contacts)
      .where(and(eq(contacts.clientId, clientIdInt), eq(contacts.phone, trimmedPhone)))
      .limit(1);

    if (phoneExists.length > 0) {
      return NextResponse.json({ 
        error: "Phone number already exists for this client",
        code: "DUPLICATE_PHONE"
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const newContact = await db.insert(contacts)
      .values({
        clientId: clientIdInt,
        fullName: trimmedFullName,
        designation: designation?.trim() || null,
        email: trimmedEmail,
        phone: trimmedPhone,
        isPrimary: isFirstContact,
        status: 'active',
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newContact[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require Underwriter or higher to update contacts
    const roleCheck = await requireRole(request, VALID_ROLES.UNDERWRITER);
    if (!roleCheck.success) return roleCheck.response;

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const contactId = searchParams.get('contactId');

    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ error: 'Valid client ID is required', code: 'INVALID_CLIENT_ID' }, { status: 400 });
    }
    if (!contactId || isNaN(parseInt(contactId))) {
      return NextResponse.json({ error: 'Valid contact ID is required', code: 'INVALID_CONTACT_ID' }, { status: 400 });
    }

    const clientIdInt = parseInt(clientId);
    const contactIdInt = parseInt(contactId);

    // Ensure client exists
    const clientExists = await db.select().from(clients).where(eq(clients.id, clientIdInt)).limit(1);
    if (clientExists.length === 0) {
      return NextResponse.json({ error: 'Client not found', code: 'CLIENT_NOT_FOUND' }, { status: 404 });
    }

    // Ensure contact exists under client
    const existing = await db.select().from(contacts)
      .where(and(eq(contacts.id, contactIdInt), eq(contacts.clientId, clientIdInt)))
      .limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Contact not found', code: 'CONTACT_NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json();
    const { fullName, email, phone, designation, isPrimary, status } = body as {
      fullName?: string;
      email?: string;
      phone?: string;
      designation?: string;
      isPrimary?: boolean;
      status?: string;
    };

    const updates: any = {};

    if (fullName !== undefined) updates.fullName = fullName.trim();

    if (email !== undefined) {
      const emailTrimmed = email.toLowerCase().trim();
      const emailCheck = validateEmail(emailTrimmed);
      if (!emailCheck.success) {
        return NextResponse.json({ error: emailCheck.error || 'Invalid email', code: 'INVALID_EMAIL' }, { status: 400 });
      }
      // duplicate check excluding current
      const dupEmail = await db.select().from(contacts)
        .where(and(eq(contacts.clientId, clientIdInt), eq(contacts.email, emailTrimmed), ne(contacts.id, contactIdInt)))
        .limit(1);
      if (dupEmail.length > 0) {
        return NextResponse.json({ error: 'Email already exists for this client', code: 'DUPLICATE_EMAIL' }, { status: 400 });
      }
      updates.email = emailTrimmed;
    }

    if (phone !== undefined) {
      const phoneTrimmed = phone.trim();
      const phoneCheck = validatePhone(phoneTrimmed);
      if (!phoneCheck.success) {
        return NextResponse.json({ error: phoneCheck.error || 'Invalid phone', code: 'INVALID_PHONE' }, { status: 400 });
      }
      const dupPhone = await db.select().from(contacts)
        .where(and(eq(contacts.clientId, clientIdInt), eq(contacts.phone, phoneTrimmed), ne(contacts.id, contactIdInt)))
        .limit(1);
      if (dupPhone.length > 0) {
        return NextResponse.json({ error: 'Phone number already exists for this client', code: 'DUPLICATE_PHONE' }, { status: 400 });
      }
      updates.phone = phoneTrimmed;
    }

    if (designation !== undefined) updates.designation = designation?.trim() || null;
    if (status !== undefined) updates.status = status;

    // Handle primary flag
    if (isPrimary === true && existing[0].isPrimary !== true) {
      // unset others' primary
      await db.update(contacts)
        .set({ isPrimary: false })
        .where(and(eq(contacts.clientId, clientIdInt), ne(contacts.id, contactIdInt)));
      updates.isPrimary = true;
    } else if (isPrimary === false) {
      updates.isPrimary = false;
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(contacts)
      .set(updates)
      .where(and(eq(contacts.id, contactIdInt), eq(contacts.clientId, clientIdInt)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require Underwriter or higher to delete contacts
    const roleCheck = await requireRole(request, VALID_ROLES.UNDERWRITER);
    if (!roleCheck.success) return roleCheck.response;

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const contactId = searchParams.get('contactId');

    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ error: 'Valid client ID is required', code: 'INVALID_CLIENT_ID' }, { status: 400 });
    }
    if (!contactId || isNaN(parseInt(contactId))) {
      return NextResponse.json({ error: 'Valid contact ID is required', code: 'INVALID_CONTACT_ID' }, { status: 400 });
    }

    const clientIdInt = parseInt(clientId);
    const contactIdInt = parseInt(contactId);

    // Ensure contact exists
    const existing = await db.select().from(contacts)
      .where(and(eq(contacts.id, contactIdInt), eq(contacts.clientId, clientIdInt)))
      .limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Contact not found', code: 'CONTACT_NOT_FOUND' }, { status: 404 });
    }

    const deleted = await db.delete(contacts)
      .where(and(eq(contacts.id, contactIdInt), eq(contacts.clientId, clientIdInt)))
      .returning();

    return NextResponse.json({ message: 'Contact deleted', contact: deleted[0] });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}