import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, reminders, users, policies, clients } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { requireApprovalLevel } from '@/app/api/_lib/auth';
import PDFDocument from 'pdfkit';
import crypto from 'crypto';

// Minimal PDF generator (same fields as /pdf route)
function generatePdfBuffer({ note, client, policy }: { note: any; client: any; policy?: any; }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Office header (mimic main PDF)
    doc.fontSize(10).text(
      "Office: 2, Adeniji Street, Surulere, Lagos.\nTelephone: 0808-927-9217, 0912-436-4915\nE-mail: info@mutualequityinsurance.com | naveen@mutualequityinsurance.com",
      { align: 'left' }
    );
    doc.moveDown(1);

    const isCN = note.noteType === "CN";
    const title = `${isCN ? "CREDIT NOTE" : "DEBIT NOTE"}`;
    doc.fontSize(18).text(`${title}`, { align: "center" });
    doc.moveDown(0.5);

    // Top details
    doc.fontSize(11);
    const line = (k: string, v?: any) => doc.text(`${k}: ${v ?? ""}`);

    line("INSURER", note.insurer?.legalName || note.insurer?.tradingName || note.insurer?.companyName || "");
    line(isCN ? "CREDIT NO#" : "DEBIT NO#", note.noteId);
    line("DATE", new Date(note.createdAt || Date.now()).toLocaleDateString());
    line("POLICY NO", policy?.policyNumber || "TBA");
    line("INSURED", client?.companyName || client?.legalName || "");

    // Period and sums
    const periodEnd = policy?.policyEndDate ? new Date(policy.policyEndDate).toLocaleDateString() : "TILL DELIVERY";
    const periodStr = policy?.policyStartDate && policy.policyEndDate
      ? `${new Date(policy.policyStartDate).toLocaleDateString()} - ${periodEnd}`
      : note?.periodFrom && note?.periodTo
        ? `${new Date(note.periodFrom).toLocaleDateString()} - ${new Date(note.periodTo).toLocaleDateString()}`
        : "";
    line("PERIOD", periodStr);

    // Class line for clarity
    const lobName = policy?.lob?.name || "";
    const isFire = (lobName || "").toString().toUpperCase().includes("FIRE");
    const isMarine = (lobName || "").toString().toUpperCase().includes("MARINE");
    line("Class", isFire ? "FIRE AND SPECIAL PERILS" : isMarine ? "MARINE CLAUSES 'C'" : lobName || "MOTOR INSURANCE (COMPREHENSIVE)");

    doc.moveDown(0.5);
    // Financials block
    doc.fontSize(12).text("DETAILS");
    doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.5);

    const money = (n: any) =>
      typeof n === "number" ? `₦ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : n ?? "-";

    const pct = (n: any) => (typeof n === "number" ? `${n.toFixed(2)}%` : n ?? "-");

    // Use available computed fields on note
    const gross = Number(note.grossPremium) || 0;
    const brkPct = Number(note.brokeragePercent) || 0;
    const brkAmt = Number(note.brokerageAmount) || (gross * brkPct) / 100;
    const vatAmt = Number(note.vatOnBrokerage) || (brkAmt * 7.5) / 100;
    const proportionPct = Number(note.proportionPercent) || 100;
    const netToInsurer = Number(note.netAmountDue) || gross - brkAmt - vatAmt;

    line("GROSS PREMIUM", money(gross));
    if (isMarine) {
      line(`BEING ${proportionPct.toFixed(2)}% SHARE OF THE PREMIUM DUE`, money(gross));
    }
    line("Brokerage", `${pct(brkPct)} (${money(brkAmt)})`);
    line("VAT ON COMMISSION 7.5%", money(vatAmt));
    line("Net Premium due to Insurers", money(netToInsurer));
    line("Proportion", `${proportionPct.toFixed(2)}%`);
    line(isFire || isMarine ? "Net Amount Due" : "Gross Amount Due", money(netToInsurer));

    doc.moveDown(1);

    // Prepared/Authorized
    const prepared = note.preparedByName || note.preparedBy || "";
    const authorized = note.authorizedByName || note.authorizedBy || "";
    doc.text(`Prepared by: ${prepared}`);
    doc.text(`Authorized by: ${authorized}`);

    doc.moveDown(1.25);

    // Conditional section by class
    if (isFire) {
      doc.fontSize(14).text("FIRE & SPECIAL PERILS", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(11);

      // Summary lines aligned with provided Fire CN example
      line("INSURER", note.insurer?.legalName || note.insurer?.tradingName || note.insurer?.companyName || "");
      line("POLICY NO.", policy?.policyNumber || "TBA");
      line("Class", "FIRE AND SPECIAL PERILS");
      line("INSURED", client?.companyName || client?.legalName || "");
      line("PERIOD", periodStr);

      // Sum insured and rate if available
      const sumInsured = Number(policy?.sumInsured || note?.sumInsured) || undefined;
      const ratePct = Number(policy?.ratePercent || note?.ratePercent) || undefined;
      if (sumInsured !== undefined) line("SUM INSURED", money(sumInsured));
      if (ratePct !== undefined && !Number.isNaN(ratePct)) line("RATE", pct(ratePct));
      // Some Fire schedules carry breakdown as "VARIOUS"
      line("VARIOUS", "VARIOUS");
    } else if (isMarine) {
      doc.fontSize(14).text("MARINE INSURANCE", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(11);

      line("INSURER", note.insurer?.legalName || note.insurer?.tradingName || note.insurer?.companyName || "");
      line("POLICY NO.", policy?.policyNumber || "TBA");
      line("Class", "MARINE CLAUSES 'C'");
      line("INSURED", client?.companyName || client?.legalName || "");
      line("PERIOD", periodStr);

      const sumInsured = Number(policy?.sumInsured || note?.sumInsured) || undefined;
      const ratePct = Number(policy?.ratePercent || note?.ratePercent) || undefined;
      if (sumInsured !== undefined) line("SUM INSURED", money(sumInsured));
      if (ratePct !== undefined && !Number.isNaN(ratePct)) line("RATE", pct(ratePct));
    } else {
      // Broking Slip (Motor Comprehensive)
      doc.fontSize(14).text("BROKING SLIP", { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(11);
      line("INSURED", client?.companyName || client?.legalName || "");
      line("OCCUPATION", client?.industry || client?.occupation || "");
      line("PERIOD", periodStr);
      line("INSURER", note.insurer?.legalName || note.insurer?.tradingName || note.insurer?.companyName || "");
      line("POLICY NO.", policy?.policyNumber || "TBA");
      line("Class of Business", lobName || "MOTOR INSURANCE (COMPREHENSIVE)");

      doc.moveDown(0.5);
      doc.text("Scope of Cover: MOTOR INSURANCE (COMPREHENSIVE)");
      doc.moveDown(0.25);

      // Vehicle details - placeholders if not available
      line("REG NO", policy?.vehicleRegNo || "AAA 951 KA");
      line("CHASIS NO.", policy?.vehicleChassisNo || "SEE ATTACHED");
      line("VEHICLE MAKE", policy?.vehicleMake || "TOYOTA HILUX");
      line("INSURED", client?.companyName || client?.legalName || "");
      line("PREMIUM", money(gross));

      doc.moveDown(0.5);
      line("TOTAL PREMIUM", money(gross));

      doc.moveDown(0.75);
      // Declaration for Broking Slip
      doc.fontSize(10).text("DECLARATION", { underline: true, align: "center" });
      doc.moveDown(0.25);
      doc.text("This slip is issued by Mutual Equity Insurance Broking Ltd., licensed by NAICOM & NCRIB.", { align: "center" });
      doc.text("All premiums payable strictly to the Insurer's account. Subject to insurers' terms and conditions.", { align: "center" });
      doc.moveDown(0.5);
      doc.text("Authorised Signatory", { underline: true, align: "center" });
      doc.text(`Name: ${authorized || "______________________"}`, { align: "center" });
      doc.text("Designation: ______________________", { align: "center" });
      doc.text("Date: ___ / ___ / ___", { align: "center" });
    }

    doc.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    // Enforce approval level >= L3 before proceeding
    const approvalCheck = requireApprovalLevel(request, 3);
    if (!approvalCheck.success) return approvalCheck.response;

    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required', code: 'MISSING_NOTE_ID' }, { status: 400 });
    }

    // Fetch note and ensure status is Approved
    const noteResult = await db.select()
      .from(notes)
      .leftJoin(policies, eq(notes.policyId, policies.id))
      .leftJoin(clients, eq(notes.clientId, clients.id))
      .where(and(eq(notes.noteId, noteId), eq(notes.status, 'Approved')))
      .limit(1);

    if (noteResult.length === 0) {
      return NextResponse.json({ error: 'Note not found or not approved' }, { status: 404 });
    }

    const row: any = noteResult[0];
    const note = row.notes;
    const policy = row.policies;
    const client = row.clients;

    // Generate PDF and compute SHA-256 hash
    const pdfBuffer = await generatePdfBuffer({ note, client, policy });
    const sha256Hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const nowISO = new Date().toISOString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Update note status to Issued and save PDF path + hash
    const pdfPath = `/pdf/${note.noteId}.pdf`;
    await db.update(notes)
      .set({ status: 'Issued', updatedAt: nowISO, pdfPath, sha256Hash })
      .where(eq(notes.noteId, noteId));

    // Create reminders
    const remindersData: any[] = [];

    if (note.noteType === 'DN') {
      remindersData.push({
        noteId: note.id,
        type: 'RemitPremium',
        dueDate,
        status: 'Pending',
        createdAt: nowISO,
        updatedAt: nowISO
      });
      remindersData.push({
        noteId: note.id,
        type: 'VATOnCommission',
        dueDate,
        status: 'Pending',
        createdAt: nowISO,
        updatedAt: nowISO
      });
    }

    let insertedReminders: any[] = [];
    if (remindersData.length > 0) {
      insertedReminders = await db.insert(reminders).values(remindersData).returning();
    }

    const updatedNote = await db.select()
      .from(notes)
      .where(eq(notes.noteId, noteId))
      .limit(1);

    return NextResponse.json({ note: updatedNote[0], reminders: insertedReminders }, { status: 200 });
  } catch (error) {
    console.error('POST note issuance error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}