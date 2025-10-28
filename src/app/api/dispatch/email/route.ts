import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, insurerEmails, contacts, clients, policies, dispatchLogs, users, insurers, auditLogs } from '@/db/schema';
import { eq, and, or, inArray, sql, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import nodemailer from 'nodemailer';
// @ts-ignore - pdfkit standalone doesn't have types but works in Node
import PDFDocument from 'pdfkit/js/pdfkit.standalone';

const VALID_INSURER_ROLES = ['underwriter', 'marketer', 'MD', 'ED', 'DGM', 'Head_of_RI', 'claims', 'technical'];

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateMockMessageId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Minimal PDF generator for CN/DN (Motor Comprehensive layout)
async function generateNotePdfBuffer({
  note,
  client,
  insurer,
  policy,
}: {
  note: any;
  client: any;
  insurer: any;
  policy: any;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (d: Buffer | Uint8Array) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Header block (office/contact)
    doc.fontSize(10).text(
      'Office: 2, Adeniji Street, Surulere, Lagos.\nTelephone: 0808-927-9217, 0912-436-4915\nE-mail: info@mutualequityinsurance.com | naveen@mutualequityinsurance.com',
      { align: 'left' }
    );

    doc.moveDown(1);

    const isCN = note.noteType === 'CN';
    const title = `${isCN ? 'CREDIT NOTE' : 'DEBIT NOTE'}`;
    doc.fontSize(18).text(`${title}`, { align: 'center' });
    doc.moveDown(0.5);

    // Top details
    doc.fontSize(11);
    const line = (k: string, v?: any) => doc.text(`${k}: ${v ?? ''}`);

    line('INSURER', insurer?.legalName || insurer?.tradingName || insurer?.companyName || '');
    line(isCN ? 'CREDIT NO#' : 'DEBIT NO#', note.noteId);
    line('DATE', new Date(note.createdAt || Date.now()).toLocaleDateString());
    line('POLICY NO', policy?.policyNumber || 'TBA');
    line('INSURED', client?.companyName || client?.legalName || '');

    // Period
    const periodStr = policy?.policyStartDate && policy?.policyEndDate
      ? `${new Date(policy.policyStartDate).toLocaleDateString()} - ${new Date(policy.policyEndDate).toLocaleDateString()}`
      : note?.periodFrom && note?.periodTo
        ? `${new Date(note.periodFrom).toLocaleDateString()} - ${new Date(note.periodTo).toLocaleDateString()}`
        : '';
    line('PERIOD', periodStr);

    // Add Class and detect Fire & Special Perils
    const lobName = (policy as any)?.lob?.name || '';
    const isFire = (lobName || '').toString().toUpperCase().includes('FIRE');
    const isMarine = (lobName || '').toString().toUpperCase().includes('MARINE');
    line('Class', isFire ? 'FIRE AND SPECIAL PERILS' : isMarine ? "MARINE CLAUSES 'C'" : lobName || 'MOTOR INSURANCE (COMPREHENSIVE)');

    doc.moveDown(0.5);
    // Financials block
    doc.fontSize(12).text('DETAILS');
    doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.5);

    const money = (n: any) =>
      typeof n === 'number' ? `₦ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (n ?? '-') as string;
    const pct = (n: any) => (typeof n === 'number' ? `${n.toFixed(2)}%` : (n ?? '-') as string);

    const gross = Number(note.grossPremium) || 0;
    const brkPct = Number(note.brokeragePercent) || 0;
    const brkAmt = Number(note.brokerageAmount) || (gross * brkPct) / 100;
    const vatAmt = Number(note.vatOnBrokerage) || (brkAmt * 7.5) / 100;
    const proportionPct = Number(note.proportionPercent) || 100;
    const netToInsurer = Number(note.netAmountDue) || gross - brkAmt - vatAmt;

    line('GROSS PREMIUM', money(gross));
    line('Brokerage', `${pct(brkPct)} (${money(brkAmt)})`);
    line('VAT ON COMMISSION 7.5%', money(vatAmt));
    line('Net Premium due to Insurers', money(netToInsurer));
    line('Proportion', `${proportionPct.toFixed(2)}%`);
    line(isFire || isMarine ? 'Net Amount Due' : 'Gross Amount Due', money(netToInsurer));

    doc.moveDown(1);

    // Prepared/Authorized
    const prepared = note.preparedByName || note.preparedBy || '';
    const authorized = note.authorizedByName || note.authorizedBy || '';
    doc.text(`Prepared by: ${prepared}`);
    doc.text(`Authorized by: ${authorized}`);

    doc.moveDown(1.25);

    // Conditional section by class
    if (isFire) {
      doc.fontSize(14).text('FIRE & SPECIAL PERILS', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11);

      line('INSURER', insurer?.legalName || insurer?.tradingName || insurer?.companyName || '');
      line('POLICY NO.', (policy as any)?.policyNumber || 'TBA');
      line('Class', 'FIRE AND SPECIAL PERILS');
      line('INSURED', client?.companyName || client?.legalName || '');
      line('PERIOD', periodStr);

      const sumInsured = Number((policy as any)?.sumInsured || (note as any)?.sumInsured) || undefined;
      const ratePct = Number((policy as any)?.ratePercent || (note as any)?.ratePercent) || undefined;
      if (sumInsured !== undefined) line('SUM INSURED', money(sumInsured));
      if (ratePct !== undefined && !Number.isNaN(ratePct)) line('RATE', pct(ratePct));
      line('VARIOUS', 'VARIOUS');
    } else if (isMarine) {
      doc.fontSize(14).text('MARINE INSURANCE', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11);

      line('INSURER', insurer?.legalName || insurer?.tradingName || insurer?.companyName || '');
      line('POLICY NO.', (policy as any)?.policyNumber || 'TBA');
      line('Class', "MARINE CLAUSES 'C'");
      line('INSURED', client?.companyName || client?.legalName || '');
      line('PERIOD', periodStr);

      const sumInsured = Number((policy as any)?.sumInsured || (note as any)?.sumInsured) || undefined;
      const ratePct = Number((policy as any)?.ratePercent || (note as any)?.ratePercent) || undefined;
      if (sumInsured !== undefined) line('SUM INSURED', money(sumInsured));
      if (ratePct !== undefined && !Number.isNaN(ratePct)) line('RATE', pct(ratePct));
    } else {
      // Broking Slip (Motor Comprehensive)
      doc.fontSize(14).text('BROKING SLIP', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(11);
      line('INSURED', client?.companyName || client?.legalName || '');
      line('OCCUPATION', client?.industry || client?.occupation || '');
      line('PERIOD', periodStr);
      line('INSURER', insurer?.legalName || insurer?.tradingName || insurer?.companyName || '');
      line('POLICY NO.', (policy as any)?.policyNumber || 'TBA');
      line('Class of Business', (policy as any)?.lob?.name || 'MOTOR INSURANCE (COMPREHENSIVE)');

      doc.moveDown(0.5);
      doc.text('Scope of Cover: MOTOR INSURANCE (COMPREHENSIVE)');
      doc.moveDown(0.25);

      // Vehicle details - placeholders if not available
      line('REG NO', (policy as any)?.vehicleRegNo || 'AAA 951 KA');
      line('CHASIS NO.', (policy as any)?.vehicleChassisNo || 'SEE ATTACHED');
      line('VEHICLE MAKE', (policy as any)?.vehicleMake || 'TOYOTA HILUX');
      line('INSURED', client?.companyName || client?.legalName || '');
      line('PREMIUM', money(gross));

      doc.moveDown(0.5);
      line('TOTAL PREMIUM', money(gross));

      doc.moveDown(0.75);
      // Declaration for Broking Slip
      doc.fontSize(10).text('DECLARATION', { underline: true, align: 'center' });
      doc.moveDown(0.25);
      doc.text('This slip is issued by Mutual Equity Insurance Broking Ltd., licensed by NAICOM & NCRIB.', { align: 'center' });
      doc.text('All premiums payable strictly to the Insurer\'s account. Subject to insurers\' terms and conditions.', { align: 'center' });
      doc.moveDown(0.5);
      doc.text('Authorised Signatory', { underline: true, align: 'center' });
      doc.text(`Name: ${authorized || '______________________'}`, { align: 'center' });
      doc.text('Designation: ______________________', { align: 'center' });
      doc.text('Date: ___ / ___ / ___', { align: 'center' });
    }

    doc.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { noteId, toRoles, toExtraEmails } = body;

    // SECURITY: Check for forbidden user ID fields
    if ('userId' in body || 'user_id' in body || 'sentBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!noteId || typeof noteId !== 'string') {
      return NextResponse.json({ 
        error: "Valid noteId is required",
        code: "MISSING_NOTE_ID" 
      }, { status: 400 });
    }

    if (!toRoles || !Array.isArray(toRoles) || toRoles.length === 0) {
      return NextResponse.json({ 
        error: "toRoles must be a non-empty array",
        code: "MISSING_TO_ROLES" 
      }, { status: 400 });
    }

    // Validate toRoles
    const invalidRoles = toRoles.filter(role => !VALID_INSURER_ROLES.includes(role));
    if (invalidRoles.length > 0) {
      return NextResponse.json({ 
        error: `Invalid insurer roles: ${invalidRoles.join(', ')}`,
        code: "INVALID_INSURER_ROLES" 
      }, { status: 400 });
    }

    // Validate toExtraEmails if provided
    if (toExtraEmails && Array.isArray(toExtraEmails)) {
      const invalidEmails = toExtraEmails.filter((email: string) => !validateEmail(email));
      if (invalidEmails.length > 0) {
        return NextResponse.json({ 
          error: `Invalid email addresses: ${invalidEmails.join(', ')}`,
          code: "INVALID_EXTRA_EMAILS" 
        }, { status: 400 });
      }
    }

    // Get note with related data
    const noteResult = await db.select({
      note: notes,
      client: clients,
      policy: policies,
      insurer: insurers,
    })
    .from(notes)
    .leftJoin(clients, eq(notes.clientId, clients.id))
    .leftJoin(policies, eq(notes.policyId, policies.id))
    .leftJoin(insurers, eq(notes.insurerId, insurers.id))
    .where(eq(notes.noteId, noteId))
    .limit(1);

    if (noteResult.length === 0) {
      return NextResponse.json({ 
        error: "Note not found",
        code: "NOTE_NOT_FOUND" 
      }, { status: 404 });
    }

    const note = noteResult[0].note;
    const client = noteResult[0].client;
    const insurer = noteResult[0].insurer;
    const policy = noteResult[0].policy;

    let recipientEmails: string[] = [];
    let subject = '';
    let dispatchErrors: string[] = [];

    try {
      if (note.noteType === 'CN') {
        // Credit Note - send to insurer contacts based on roles
        if (!note.insurerId) {
          return NextResponse.json({ 
            error: "Insurer not found for CN",
            code: "MISSING_INSURER" 
          }, { status: 400 });
        }

        const insurerEmailsResult = await db.select()
          .from(insurerEmails)
          .where(and(
            eq(insurerEmails.insurerId, note.insurerId),
            eq(insurerEmails.active, true),
            inArray(insurerEmails.role, toRoles)
          ));

        recipientEmails = insurerEmailsResult.map(e => e.email);
        subject = `Credit Note ${note.noteId} - ${client?.companyName || 'Client'}`;

        if (recipientEmails.length === 0) {
          dispatchErrors.push(`No active email contacts found for insurer roles: ${toRoles.join(', ')}`);
        }
      } else if (note.noteType === 'DN') {
        // Debit Note - send to client contacts
        if (!note.clientId) {
          return NextResponse.json({ 
            error: "Client not found for DN",
            code: "MISSING_CLIENT" 
          }, { status: 400 });
        }

        const contactsResult = await db.select()
          .from(contacts)
          .where(and(
            eq(contacts.clientId, note.clientId),
            eq(contacts.status, 'active'),
            eq(contacts.isPrimary, true)
          ));

        if (contactsResult.length === 0) {
          // Fallback to all active contacts
          const allContacts = await db.select()
            .from(contacts)
            .where(and(
              eq(contacts.clientId, note.clientId),
              eq(contacts.status, 'active')
            ));
          if (allContacts.length > 0) {
            contactsResult.push(...allContacts);
          }
        }

        recipientEmails = contactsResult.map(c => c.email);
        subject = `Debit Note ${note.noteId} - ${client?.companyName || 'Client'}`;

        if (recipientEmails.length === 0) {
          dispatchErrors.push(`No active contacts found for client`);
        }
      } else {
        return NextResponse.json({ 
          error: "Invalid note type",
          code: "INVALID_NOTE_TYPE" 
        }, { status: 400 });
      }

      // Add extra emails if provided
      if (toExtraEmails && Array.isArray(toExtraEmails)) {
        recipientEmails.push(...toExtraEmails);
      }

      // Remove duplicates
      recipientEmails = [...new Set(recipientEmails)];

      if (recipientEmails.length === 0) {
        return NextResponse.json({ 
          error: dispatchErrors.length > 0 ? dispatchErrors[0] : "No recipients found",
          code: "NO_RECIPIENTS" 
        }, { status: 400 });
      }

      // Ensure SMTP env
      const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS,
        SMTP_SECURE,
        SMTP_FROM,
      } = process.env as Record<string, string>;

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM || (!SMTP_USER && !SMTP_PASS && SMTP_SECURE !== 'false')) {
        return NextResponse.json({
          error: 'SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, SMTP_PASS.',
          code: 'MISSING_SMTP_CONFIG',
        }, { status: 500 });
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587', 10),
        secure: (SMTP_SECURE ?? 'false') === 'true',
        auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      } as any);

      // Generate PDF (always generate fresh attachment)
      const pdfBuffer = await generateNotePdfBuffer({ note, client, insurer, policy });
      const filename = `${note.noteType}-${note.noteId}.pdf`;

      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to: recipientEmails.join(', '),
        subject,
        text: `${note.noteType} ${note.noteId} attached.`,
        attachments: [
          { filename, content: pdfBuffer, contentType: 'application/pdf' },
        ],
      });

      const providerMessageId = (info && (info as any).messageId) || generateMockMessageId();
      const sentAt = new Date().toISOString();

      // Create dispatch log
      const logEntry = await db.insert(dispatchLogs)
        .values({
          noteId: typeof note.id === 'number' ? note.id : parseInt(String(note.id)),
          recipientEmails: JSON.stringify(recipientEmails),
          subject: subject,
          status: 'sent',
          providerMessageId: providerMessageId,
          sentBy: typeof user.id === 'number' ? user.id : parseInt(String(user.id)),
          sentAt: sentAt,
        })
        .returning();

      // Audit: record dispatch with channel and stored PDF hash
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
      const userAgent = request.headers.get('user-agent') || '';
      const auditUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id));
      const auditRecordId = typeof note.id === 'number' ? note.id : parseInt(String(note.id));

      await db.insert(auditLogs).values({
        tableName: 'dispatch',
        recordId: auditRecordId,
        action: 'DISPATCH',
        oldValues: null as any,
        newValues: {
          channel: 'email',
          noteId: note.noteId,
          providerMessageId,
          recipients: recipientEmails,
          attachmentName: filename,
          sha256Hash: note.sha256Hash || null,
        } as any,
        userId: auditUserId,
        ipAddress,
        userAgent,
        createdAt: sentAt,
      });

      return NextResponse.json({
        success: true,
        status: 'sent',
        recipients: recipientEmails.length,
        logEntry: logEntry[0],
        noteId: note.noteId,
        noteType: note.noteType,
      });

    } catch (error: any) {
      // Log failed dispatch attempt
      const failedLog = await db.insert(dispatchLogs)
        .values({
          noteId: typeof note.id === 'number' ? note.id : parseInt(String(note.id)),
          recipientEmails: JSON.stringify(recipientEmails),
          subject: subject || `${note.noteType} ${note.noteId}`,
          status: 'failed',
          errorMessage: error?.message || 'Unknown error',
          sentBy: typeof user.id === 'number' ? user.id : parseInt(String(user.id)),
          sentAt: new Date().toISOString(),
        })
        .returning();

      // Audit failure as well
      const ipAddressFail = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
      const userAgentFail = request.headers.get('user-agent') || '';
      const failAuditUserId = typeof user.id === 'number' ? user.id : parseInt(String(user.id));
      const failAuditRecordId = typeof note.id === 'number' ? note.id : parseInt(String(note.id));

      await db.insert(auditLogs).values({
        tableName: 'dispatch',
        recordId: failAuditRecordId,
        action: 'DISPATCH',
        oldValues: null as any,
        newValues: {
          channel: 'email',
          noteId: note.noteId,
          status: 'failed',
          error: error?.message || 'Unknown error',
        } as any,
        userId: failAuditUserId,
        ipAddress: ipAddressFail,
        userAgent: userAgentFail,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: false,
        status: 'failed',
        error: 'Failed to dispatch email',
        details: error?.message,
        logEntry: failedLog[0],
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Email dispatch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: "INTERNAL_ERROR" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (noteId) {
      // Get dispatch logs for specific note
      const logs = await db.select({
        log: dispatchLogs,
        note: notes.noteId,
        sentByUser: users.fullName,
      })
      .from(dispatchLogs)
      .leftJoin(notes, eq(dispatchLogs.noteId, notes.id))
      .leftJoin(users, eq(dispatchLogs.sentBy, users.id))
      .where(eq(notes.noteId, noteId))
      .orderBy(desc(dispatchLogs.sentAt))
      .limit(limit)
      .offset(offset);

      return NextResponse.json(logs);
    } else {
      // Get all dispatch logs
      const logs = await db.select({
        log: dispatchLogs,
        note: notes.noteId,
        sentByUser: users.fullName,
      })
      .from(dispatchLogs)
      .leftJoin(notes, eq(dispatchLogs.noteId, notes.id))
      .leftJoin(users, eq(dispatchLogs.sentBy, users.id))
      .orderBy(desc(dispatchLogs.sentAt))
      .limit(limit)
      .offset(offset);

      return NextResponse.json(logs);
    }

  } catch (error) {
    console.error('GET dispatch logs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: "INTERNAL_ERROR" 
    }, { status: 500 });
  }
}