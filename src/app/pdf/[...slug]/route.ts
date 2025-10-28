import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, clients, insurers, policies, lobs, subLobs, bankAccounts, cnInsurerShares, users } from "@/db/schema";
import { eq } from "drizzle-orm";
// @ts-ignore - pdfkit standalone doesn't have types but works in Node
import PDFDocument from "pdfkit/js/pdfkit.standalone";

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'N/A';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface EnhancedNoteData {
  note: any;
  client: any;
  insurer: any;
  policy: any;
  lob: any;
  subLob: any;
  bankAccount: any;
  coInsurers: any[];
}

function generatePdf(data: EnhancedNoteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { note, client, insurer, policy, lob, subLob, bankAccount, coInsurers } = data;
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
      autoFirstPage: true
    });
    const chunks: Buffer[] = [];

    doc.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const isCN = note.noteType === 'CN';
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 40;
    const tableWidth = pageWidth - (margin * 2);

    // Calculate financial values
    const gross = Number(note.grossPremium) || 0;
    const brkPct = Number(note.brokeragePct) || 0;
    const brkAmt = Number(note.brokerageAmount) || (gross * brkPct) / 100;
    const vatPct = Number(note.vatPct) || 7.5;
    const vatAmt = Number(note.vatOnBrokerage) || (brkAmt * vatPct) / 100;
    const netToInsurer = Number(note.netAmountDue) || (gross - brkAmt - vatAmt);

    // Calculate rate from policy or note
    const sumInsured = Number(policy?.sumInsured || note.sumInsured || 0);
    const rate = sumInsured > 0 ? ((gross / sumInsured) * 100) : 0;

    // Helper to draw bordered cell
    const drawCell = (x: number, y: number, width: number, height: number, text: string, options: any = {}) => {
      const { align = 'left', fontSize = 10, bold = false, padding = 5, valign = 'center' } = options;

      // Draw border
      doc.rect(x, y, width, height).stroke();

      // Draw text
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

      let textX = x + padding;
      if (align === 'center') textX = x + width / 2;
      if (align === 'right') textX = x + width - padding;

      const textY = valign === 'top' ? y + padding : y + (height - fontSize) / 2;

      doc.text(text, textX, textY, {
        width: width - (padding * 2),
        align,
        lineBreak: false
      });
    };

    let yPos = 50;

    // ================== HEADER BOX ==================
    const headerHeight = 60;
    doc.rect(margin, yPos, tableWidth, headerHeight).stroke();

    doc.fontSize(8).font('Helvetica');
    doc.text('Office: 2, Adeniji Street, Surulere, Lagos .', margin + 10, yPos + 10);
    doc.text('Telephone : 0802-304-3996, 0912-436-4915', margin + 10, yPos + 22);
    doc.text('E-mail : info@mutualequityinsurance.com', margin + 10, yPos + 34);
    doc.text('E-mail : naveen@mutualequityinsurance.com', margin + 10, yPos + 46);

    // Logo/Company name (right side)
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('MUTUAL EQUITY', pageWidth - margin - 140, yPos + 18, { width: 130, align: 'right' });
    doc.fontSize(8).font('Helvetica');
    doc.text('INSURANCE BROKERS LIMITED', pageWidth - margin - 140, yPos + 32, { width: 130, align: 'right' });

    yPos += headerHeight;

    // ================== TITLE ==================
    const titleHeight = 28;
    doc.rect(margin, yPos, tableWidth, titleHeight).stroke();

    doc.font('Helvetica-Bold').fontSize(13);
    doc.text(isCN ? 'CREDIT NOTE' : 'DEBIT NOTE', margin, yPos + 7, {
      width: tableWidth,
      align: 'center'
    });

    yPos += titleHeight;

    // ================== TABLE STRUCTURE ==================
    const rowHeight = 35;
    const col1Width = tableWidth * 0.5;
    const col2Width = tableWidth * 0.25;
    const col3Width = tableWidth * 0.25;

    // Row 1: INSURER, CREDIT NO#, DATE
    const row1Y = yPos;
    // Draw borders only
    doc.rect(margin, row1Y, col1Width, rowHeight).stroke();
    doc.rect(margin + col1Width, row1Y, col2Width, rowHeight).stroke();
    doc.rect(margin + col1Width + col2Width, row1Y, col3Width, rowHeight).stroke();

    // INSURER cell
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('INSURER:', margin + 5, row1Y + 5, { width: col1Width - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(9);
    doc.text(`${insurer?.companyName || insurer?.legalName || insurer?.tradingName || 'N/A'}`,
      margin + 5, row1Y + 18, { width: col1Width - 10 });

    // CREDIT/DEBIT NO# cell
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`${isCN ? 'CREDIT' : 'DEBIT'}`, margin + col1Width + 5, row1Y + 5, { width: col2Width - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(8);
    doc.text('N0#:', margin + col1Width + 5, row1Y + 15, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text(`${note.noteId}`, margin + col1Width + 30, row1Y + 15, { width: col2Width - 35 });

    // DATE cell
    const issueDate = note.issueDate || note.createdAt;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('DATE:', margin + col1Width + col2Width + 5, row1Y + 5, { lineBreak: false });
    doc.font('Helvetica').fontSize(9);
    doc.text(formatDate(issueDate), margin + col1Width + col2Width + 5, row1Y + 18, { width: col3Width - 10 });

    yPos += rowHeight;

    // Row 2: POLICY NO, Class
    const row2Y = yPos;
    doc.rect(margin, row2Y, col1Width, rowHeight).stroke();
    doc.rect(margin + col1Width, row2Y, col2Width + col3Width, rowHeight).stroke();

    // POLICY NO cell
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('POLICY NO:', margin + 5, row2Y + 5, { width: col1Width - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(10);
    doc.text(`${policy?.policyNumber || 'TBA'}`, margin + 5, row2Y + 18, { width: col1Width - 10 });

    // Class cell
    const lobName = lob?.name || policy?.lobName || note?.lobName || 'INSURANCE';
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Class:', margin + col1Width + 5, row2Y + 5, { width: col2Width + col3Width - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(10);
    doc.text(`${lobName.toUpperCase()}`, margin + col1Width + 5, row2Y + 18, { width: col2Width + col3Width - 10 });

    yPos += rowHeight;

    // Row 3: INSURED
    const row3Y = yPos;
    doc.rect(margin, row3Y, tableWidth, rowHeight).stroke();

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('INSURED:', margin + 5, row3Y + 5, { width: tableWidth - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(10);
    doc.text(`${client?.companyName || client?.legalName || 'N/A'}`,
      margin + 5, row3Y + 18, { width: tableWidth - 10 });

    yPos += rowHeight;

    // Row 4: PERIOD and GROSS PREMIUM
    const row4Y = yPos;
    doc.rect(margin, row4Y, col1Width + col2Width, rowHeight).stroke();
    doc.rect(margin + col1Width + col2Width, row4Y, col3Width, rowHeight).stroke();

    // PERIOD cell
    const periodStr = policy?.policyStartDate && policy?.policyEndDate
      ? `${formatDate(policy.policyStartDate)} - ${formatDate(policy.policyEndDate)}`
      : 'N/A';
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('PERIOD:', margin + 5, row4Y + 5, { width: col1Width + col2Width - 10, lineBreak: false });
    doc.font('Helvetica').fontSize(9);
    doc.text(periodStr, margin + 5, row4Y + 18, { width: col1Width + col2Width - 10 });

    // GROSS PREMIUM header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('GROSS PREMIUM', margin + col1Width + col2Width, row4Y + 12, {
      width: col3Width,
      align: 'center'
    });

    yPos += rowHeight;

    // Row 5: SUM INSURED, RATE, GROSS PREMIUM VALUE
    const row5Y = yPos;
    const sumInsuredWidth = tableWidth * 0.45;
    const rateWidth = tableWidth * 0.25;
    const premiumWidth = tableWidth * 0.30;

    doc.rect(margin, row5Y, sumInsuredWidth, rowHeight).stroke();
    doc.rect(margin + sumInsuredWidth, row5Y, rateWidth, rowHeight).stroke();
    doc.rect(margin + sumInsuredWidth + rateWidth, row5Y, premiumWidth, rowHeight).stroke();

    // SUM INSURED cell
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('SUM', margin + 5, row5Y + 5, { lineBreak: false });
    doc.text('INSURED:', margin + 5, row5Y + 15, { lineBreak: false });
    doc.font('Helvetica').fontSize(10);
    doc.text(`₦`, margin + 60, row5Y + 12, { lineBreak: false });
    doc.text(sumInsured.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + 75, row5Y + 12, { width: sumInsuredWidth - 80 });

    // RATE cell
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('RATE', margin + sumInsuredWidth, row5Y + 5, {
      width: rateWidth,
      align: 'center',
      lineBreak: false
    });
    doc.font('Helvetica').fontSize(9);
    doc.text(`${rate.toFixed(3)}%`, margin + sumInsuredWidth, row5Y + 18, {
      width: rateWidth,
      align: 'center'
    });

    // GROSS PREMIUM VALUE cell
    doc.font('Helvetica').fontSize(10);
    doc.text('₦', margin + sumInsuredWidth + rateWidth + 5, row5Y + 12, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(gross.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + sumInsuredWidth + rateWidth + 20, row5Y + 12, { width: premiumWidth - 25 });

    yPos += rowHeight;

    // ================== FINANCIAL BREAKDOWN TABLE ==================
    const finRowHeight = 28;
    const leftColWidth = tableWidth * 0.7;
    const rightColWidth = tableWidth * 0.3;

    // Blank row for (=N=)
    const blankY = yPos;
    doc.rect(margin, blankY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, blankY, rightColWidth, finRowHeight).stroke();
    doc.font('Helvetica').fontSize(10);
    doc.text('(=N=)', margin + leftColWidth + 5, blankY + 8, { width: rightColWidth - 10, align: 'right' });
    yPos += finRowHeight;

    // BEING XX% SHARE OF THE PREMIUM DUE
    const shareY = yPos;
    const shareText = coInsurers && coInsurers.length > 0
      ? `BEING ${coInsurers[0]?.percentage || 100}% SHARE OF THE PREMIUM DUE`
      : 'BEING 100% SHARE OF THE PREMIUM DUE';
    doc.rect(margin, shareY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, shareY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text(shareText, margin + 5, shareY + 10, { width: leftColWidth - 10, lineBreak: false });
    doc.text('₦', margin + leftColWidth + 5, shareY + 10, { lineBreak: false });
    doc.text(gross.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + leftColWidth + 20, shareY + 10, { width: rightColWidth - 25 });
    yPos += finRowHeight;

    // Brokerage
    const brokY = yPos;
    doc.rect(margin, brokY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, brokY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text('Brokerage', margin + 5, brokY + 10, { lineBreak: false });
    doc.text(`${brkPct.toFixed(1)}%`, margin + 100, brokY + 10, { lineBreak: false });
    doc.text('₦', margin + leftColWidth + 5, brokY + 10, { lineBreak: false });
    doc.text(brkAmt.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + leftColWidth + 20, brokY + 10, { width: rightColWidth - 25 });
    yPos += finRowHeight;

    // VAT ON COMMISSION
    const vatY = yPos;
    doc.rect(margin, vatY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, vatY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text('VAT ON COMMISSION', margin + 5, vatY + 10, { lineBreak: false });
    doc.text(`${vatPct.toFixed(1)}%`, margin + 150, vatY + 10, { lineBreak: false });
    doc.text('₦', margin + leftColWidth + 5, vatY + 10, { lineBreak: false });
    doc.text(vatAmt.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + leftColWidth + 20, vatY + 10, { width: rightColWidth - 25 });
    yPos += finRowHeight;

    // Net Premium due to Insurers
    const netY = yPos;
    doc.rect(margin, netY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, netY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text('Net Premium due to Insurers', margin + 5, netY + 10, { width: leftColWidth - 10, lineBreak: false });
    doc.text('₦', margin + leftColWidth + 5, netY + 10, { lineBreak: false });
    doc.text(netToInsurer.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + leftColWidth + 20, netY + 10, { width: rightColWidth - 25 });
    yPos += finRowHeight;

    // Proportion
    const propY = yPos;
    doc.rect(margin, propY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, propY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text('Proportion', margin + 5, propY + 10, { lineBreak: false });
    doc.text('100.00%', margin + leftColWidth, propY + 10, { width: rightColWidth, align: 'center' });
    yPos += finRowHeight;

    // Net Amount Due
    const netAmtY = yPos;
    doc.rect(margin, netAmtY, leftColWidth, finRowHeight).stroke();
    doc.rect(margin + leftColWidth, netAmtY, rightColWidth, finRowHeight).stroke();

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Net Amount Due', margin + 5, netAmtY + 10, { lineBreak: false });
    doc.text('₦', margin + leftColWidth + 5, netAmtY + 10, { lineBreak: false });
    doc.text(netToInsurer.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      margin + leftColWidth + 20, netAmtY + 10, { width: rightColWidth - 25 });
    yPos += finRowHeight;

    // ================== SIGNATURE BOX ==================
    yPos += 15;
    const sigBoxHeight = 60;
    const sigBoxWidth = tableWidth / 2;

    // Draw signature boxes
    doc.rect(margin, yPos, sigBoxWidth, sigBoxHeight).stroke();
    doc.rect(margin + sigBoxWidth, yPos, sigBoxWidth, sigBoxHeight).stroke();

    // Prepared by (left)
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Prepared by:', margin + 5, yPos + 5, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`${note.preparedByName || 'N/A'}`, margin + 5, yPos + 25);

    // Authorized by (right)
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Authorized by:', margin + sigBoxWidth + 5, yPos + 5, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`${note.authorizedByName || 'N/A'}`, margin + sigBoxWidth + 5, yPos + 25);

    doc.end();
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const [type, id] = resolvedParams.slug;

    if (type !== "credit-note" && type !== "debit-note") {
      return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 });
    }

    // Convert id to number
    const noteId = parseInt(id, 10);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    // Fetch note with related data
    const result = await db
      .select({
        note: notes,
        client: clients,
        policy: {
          id: policies.id,
          policyNumber: policies.policyNumber,
          clientId: policies.clientId,
          insurerId: policies.insurerId,
          lobId: policies.lobId,
          subLobId: policies.subLobId,
          sumInsured: policies.sumInsured,
          grossPremium: policies.grossPremium,
          currency: policies.currency,
          policyStartDate: policies.policyStartDate,
          policyEndDate: policies.policyEndDate,
          status: policies.status,
        },
        insurer: insurers,
        lob: lobs,
        subLob: subLobs,
        bankAccount: bankAccounts,
      })
      .from(notes)
      .leftJoin(policies, eq(notes.policyId, policies.id))
      .leftJoin(clients, eq(notes.clientId, clients.id))
      .leftJoin(insurers, eq(notes.insurerId, insurers.id))
      .leftJoin(lobs, eq(policies.lobId, lobs.id))
      .leftJoin(subLobs, eq(policies.subLobId, subLobs.id))
      .leftJoin(bankAccounts, eq(notes.payableBankAccountId, bankAccounts.id))
      .where(eq(notes.id, noteId))
      .limit(1);

    if (!result.length) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const { note, client, insurer, policy, lob, subLob, bankAccount } = result[0];

    // Fetch user names separately
    let preparedByName = null;
    let authorizedByName = null;

    console.log('DEBUG PDF - Note ID:', note.id);
    console.log('DEBUG PDF - preparedBy ID:', note.preparedBy);
    console.log('DEBUG PDF - authorizedBy ID:', note.authorizedBy);

    if (note.preparedBy) {
      const preparedUser = await db.select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, note.preparedBy))
        .limit(1);
      preparedByName = preparedUser[0]?.fullName || null;
      console.log('DEBUG PDF - preparedByName:', preparedByName);
    }

    if (note.authorizedBy) {
      const authorizedUser = await db.select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, note.authorizedBy))
        .limit(1);
      authorizedByName = authorizedUser[0]?.fullName || null;
      console.log('DEBUG PDF - authorizedByName:', authorizedByName);
    }

    // Fetch co-insurers if they exist
    const coInsurers = await db
      .select({
        insurerName: insurers.companyName,
        percentage: cnInsurerShares.percentage,
        amount: cnInsurerShares.amount
      })
      .from(cnInsurerShares)
      .leftJoin(insurers, eq(cnInsurerShares.insurerId, insurers.id))
      .where(eq(cnInsurerShares.noteId, noteId));

    // Attach user names to note object for PDF generation
    const noteWithUserNames = {
      ...note,
      preparedByName: preparedByName || 'N/A',
      authorizedByName: authorizedByName || 'N/A'
    };

    const pdf = await generatePdf({ note: noteWithUserNames, client, insurer, policy, lob, subLob, bankAccount, coInsurers });

    // Convert Buffer to Response properly
    const buffer = Buffer.from(pdf);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${type}-${note.noteId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}