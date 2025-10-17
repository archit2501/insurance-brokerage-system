import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, clients, insurers, policies } from "@/db/schema";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function generatePdf({ note, client, insurer, policy }: { note: any; client: any; insurer: any; policy: any; }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const isCN = note.noteType === 'CN';
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points

    // ================== HEADER SECTION ==================
    doc.fontSize(10)
       .font('Helvetica')
       .text('MUTUAL EQUITY INSURANCE BROKING LIMITED', 50, 50, { align: 'center' });
    
    doc.fontSize(9)
       .text('Office: 2, Adeniji Street, Surulere, Lagos', 50, 65, { align: 'center' })
       .text('Telephone: 0808-927-9217, 0912-436-4915', 50, 78, { align: 'center' })
       .text('E-mail: info@mutualequityinsurance.com | naveen@mutualequityinsurance.com', 50, 91, { align: 'center' });

    doc.moveDown(2);

    // ================== TITLE ==================
    const titleY = 120;
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(isCN ? 'CREDIT NOTE' : 'DEBIT NOTE', 50, titleY, { align: 'center' });

    // ================== NOTE DETAILS ==================
    let yPos = titleY + 30;
    doc.fontSize(10).font('Helvetica');

    const leftCol = 50;
    const rightCol = 320;
    const lineHeight = 18;

    // Left column
    doc.text(`${isCN ? 'CREDIT' : 'DEBIT'} NO#: ${note.noteId}`, leftCol, yPos);
    yPos += lineHeight;
    doc.text(`DATE: ${formatDate(note.createdAt || Date.now())}`, leftCol, yPos);
    yPos += lineHeight;
    doc.text(`INSURER: ${insurer?.companyName || insurer?.legalName || insurer?.tradingName || 'N/A'}`, leftCol, yPos);
    yPos += lineHeight;
    doc.text(`POLICY NO: ${policy?.policyNumber || 'TBA'}`, leftCol, yPos);
    yPos += lineHeight;
    doc.text(`INSURED: ${client?.companyName || client?.legalName || 'N/A'}`, leftCol, yPos);
    
    // Period
    yPos += lineHeight;
    const periodStr = policy?.policyStartDate && policy?.policyEndDate
      ? `${formatDate(policy.policyStartDate)} - ${formatDate(policy.policyEndDate)}`
      : note?.periodFrom && note?.periodTo
        ? `${formatDate(note.periodFrom)} - ${formatDate(note.periodTo)}`
        : 'N/A';
    doc.text(`PERIOD: ${periodStr}`, leftCol, yPos);
    
    yPos += lineHeight;
    const lobName = policy?.lobName || note?.lobName || 'MOTOR INSURANCE';
    doc.text(`CLASS: ${lobName.toUpperCase()}`, leftCol, yPos);

    // ================== FINANCIAL DETAILS TABLE ==================
    yPos += 30;
    doc.fontSize(11).font('Helvetica-Bold').text('FINANCIAL DETAILS', leftCol, yPos);
    
    yPos += 20;
    // Draw table header
    doc.moveTo(leftCol, yPos).lineTo(pageWidth - 50, yPos).stroke();
    
    yPos += 5;
    const gross = Number(note.grossPremium) || 0;
    const brkPct = Number(note.brokeragePercent) || 0;
    const brkAmt = Number(note.brokerageAmount) || (gross * brkPct) / 100;
    const vatAmt = Number(note.vatOnBrokerage) || (brkAmt * 7.5) / 100;
    const netToInsurer = Number(note.netAmountDue) || gross - brkAmt - vatAmt;

    doc.fontSize(10).font('Helvetica');
    
    // Table rows
    const tableData = [
      { label: 'Gross Premium', value: formatCurrency(gross) },
      { label: `Brokerage (${brkPct.toFixed(2)}%)`, value: formatCurrency(brkAmt) },
      { label: 'VAT on Commission (7.5%)', value: formatCurrency(vatAmt) },
      { label: 'Net Premium due to Insurer', value: formatCurrency(netToInsurer), bold: true }
    ];

    tableData.forEach((row) => {
      yPos += lineHeight;
      if (row.bold) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }
      doc.text(row.label, leftCol, yPos);
      doc.text(row.value, rightCol, yPos, { width: 200, align: 'right' });
    });

    yPos += 25;
    doc.moveTo(leftCol, yPos).lineTo(pageWidth - 50, yPos).stroke();

    // ================== PREPARED/AUTHORIZED BY ==================
    yPos += 25;
    doc.fontSize(10).font('Helvetica');
    doc.text(`Prepared by: ${note.preparedByName || note.preparedBy || '_____________________'}`, leftCol, yPos);
    yPos += lineHeight;
    doc.text(`Authorized by: ${note.authorizedByName || note.authorizedBy || '_____________________'}`, leftCol, yPos);

    // ================== DECLARATION SECTION ==================
    yPos += 40;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('DECLARATION', leftCol, yPos, { align: 'center', width: pageWidth - 100 });
    
    yPos += 18;
    doc.fontSize(8)
       .font('Helvetica')
       .text('This note is issued by Mutual Equity Insurance Broking Ltd., licensed by NAICOM & NCRIB.', leftCol, yPos, { align: 'center', width: pageWidth - 100 });
    
    yPos += 14;
    doc.text('All premiums are payable strictly to the Insurer\'s designated bank account.', leftCol, yPos, { align: 'center', width: pageWidth - 100 });
    
    yPos += 14;
    doc.text('Subject to the Insurer\'s policy terms and conditions.', leftCol, yPos, { align: 'center', width: pageWidth - 100 });

    // ================== FOOTER ==================
    const footerY = pageHeight - 80;
    doc.fontSize(8)
       .font('Helvetica-Oblique')
       .text('_____________________________', leftCol, footerY, { align: 'center', width: pageWidth - 100 });
    
    doc.fontSize(8)
       .font('Helvetica')
       .text('Authorised Signatory', leftCol, footerY + 15, { align: 'center', width: pageWidth - 100 });

    doc.end();
  });
}

export async function GET(request: NextRequest, context: { params: { slug?: string[] } }) {
  try {
    const slug = context.params.slug || [];
    if (slug.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Expecting URL like /pdf/<noteId>.pdf
    const last = slug[slug.length - 1];
    const noteId = last?.toLowerCase().endsWith(".pdf") ? last.slice(0, -4) : last;

    if (!noteId) {
      return new NextResponse("Invalid note id", { status: 400 });
    }

    const result = await db
      .select({ note: notes, client: clients, policy: policies, insurer: insurers })
      .from(notes)
      .leftJoin(clients, eq(notes.clientId, clients.id))
      .leftJoin(policies, eq(notes.policyId, policies.id))
      .leftJoin(insurers, eq(notes.insurerId, insurers.id))
      .where(eq(notes.noteId, noteId))
      .limit(1);

    if (!result.length) {
      return new NextResponse("Note not found", { status: 404 });
    }

    const { note, client, insurer, policy } = result[0] as any;

    const pdf = await generatePdf({ note, client, insurer, policy });
    const filename = `${note.noteType}-${note.noteId}.pdf`;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    console.error("PDF generation error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}