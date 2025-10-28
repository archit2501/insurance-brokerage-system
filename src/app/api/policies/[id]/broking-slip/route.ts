import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, clients, insurers, lobs, subLobs, policyPropertyItems, policyCoInsuranceShares } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
// @ts-ignore - pdfkit standalone doesn't have types but works in Node
import PDFDocument from 'pdfkit/js/pdfkit.standalone';

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return 'N/A';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface BrokingSlipData {
  policy: any;
  client: any;
  insurer: any;
  lob: any;
  subLob: any;
  propertyItems: any[];
  coInsuranceShares: any[];
}

/**
 * Generate Broking Slip PDF Buffer
 */
function generateBrokingSlipPDF(data: BrokingSlipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { policy, client, insurer, lob, subLob, propertyItems, coInsuranceShares } = data;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89;
    const leftMargin = 40;
    const rightMargin = pageWidth - 40;
    const lineHeight = 16;

    // ==================== HEADER ====================
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('MUTUAL EQUITY INSURANCE BROKING LIMITED', leftMargin, 40, { align: 'center', width: pageWidth - 80 });

    doc.fontSize(9)
       .font('Helvetica')
       .text('Office: 2, Adeniji Street, Surulere, Lagos', leftMargin, 62, { align: 'center', width: pageWidth - 80 })
       .text('Telephone: 0808-927-9217, 0912-436-4915', leftMargin, 75, { align: 'center', width: pageWidth - 80 })
       .text('Email: info@mutualequityinsurance.com', leftMargin, 88, { align: 'center', width: pageWidth - 80 });

    // ==================== DOCUMENT TITLE ====================
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('BROKING SLIP', leftMargin, 115, { align: 'center', width: pageWidth - 80, underline: true });

    // ==================== DOCUMENT IDENTIFICATION ====================
    let yPos = 145;
    doc.fontSize(10).font('Helvetica');

    // Draw top border for document info section
    doc.moveTo(leftMargin, yPos - 5).lineTo(rightMargin, yPos - 5).stroke();

    yPos += 8;
    doc.font('Helvetica-Bold').text('Slip Number:', leftMargin, yPos);
    doc.font('Helvetica').text(policy.slipNumber || 'DRAFT', leftMargin + 120, yPos);

    doc.font('Helvetica-Bold').text('Date:', rightMargin - 200, yPos);
    doc.font('Helvetica').text(formatDate(policy.slipGeneratedAt || new Date()), rightMargin - 130, yPos);

    yPos += lineHeight + 3;
    doc.font('Helvetica-Bold').text('Valid Until:', leftMargin, yPos);
    doc.font('Helvetica').text(formatDate(policy.slipValidUntil), leftMargin + 120, yPos);

    yPos += 8;
    doc.moveTo(leftMargin, yPos).lineTo(rightMargin, yPos).stroke();

    // ==================== SECTION 1: THE INSURED ====================
    yPos += 15;
    doc.fontSize(11).font('Helvetica-Bold').text('1. THE INSURED', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    doc.fontSize(10).font('Helvetica');
    const clientName = client.companyName || client.legalName || 'N/A';
    doc.text(`Name: ${clientName}`, leftMargin + 10, yPos);
    
    yPos += lineHeight;
    const clientAddress = client.address || 'N/A';
    const clientLocation = [client.city, client.state, client.country].filter(Boolean).join(', ') || '';
    const fullAddress = clientAddress + (clientLocation ? ', ' + clientLocation : '');
    doc.text(`Address: ${fullAddress}`, leftMargin + 10, yPos, { width: pageWidth - 100 });
    
    yPos += lineHeight * (fullAddress.length > 80 ? 2 : 1);
    if (client.tin) {
      doc.text(`TIN: ${client.tin}`, leftMargin + 10, yPos);
      yPos += lineHeight;
    }
    
    if (client.cacRcNumber) {
      doc.text(`CAC/RC: ${client.cacRcNumber}`, leftMargin + 10, yPos);
      yPos += lineHeight;
    }

    // ==================== SECTION 2: THE INSURANCE ====================
    yPos += 10;
    doc.fontSize(11).font('Helvetica-Bold').text('2. THE INSURANCE', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    doc.fontSize(10).font('Helvetica');
    const lobName = lob?.name || 'N/A';
    const subLobName = subLob?.name || '';
    doc.text(`Class of Business: ${lobName}${subLobName ? ' - ' + subLobName : ''}`, leftMargin + 10, yPos);
    
    yPos += lineHeight;
    const periodStr = policy.policyStartDate && policy.policyEndDate
      ? `${formatDate(policy.policyStartDate)} to ${formatDate(policy.policyEndDate)}`
      : 'N/A';
    doc.text(`Period of Insurance: ${periodStr}`, leftMargin + 10, yPos);
    
    yPos += lineHeight;
    doc.text(`Sum Insured: ${formatCurrency(policy.sumInsured || 0)}`, leftMargin + 10, yPos);
    
    yPos += lineHeight;
    doc.text(`Currency: ${policy.currency || 'NGN'}`, leftMargin + 10, yPos);

    // ==================== SECTION 3: PROPERTY DETAILS ====================
    yPos += 12;
    doc.fontSize(11).font('Helvetica-Bold').text('3. PROPERTY DETAILS', leftMargin, yPos);
    yPos += lineHeight + 2;

    if (propertyItems && propertyItems.length > 0) {
      const itemType = propertyItems[0].itemType;

      // Determine table structure based on item type
      doc.fontSize(8).font('Helvetica');

      if (itemType === 'fire_perils') {
        // Fire & Special Perils table
        const tableTop = yPos;
        const colWidths = [30, 150, 70, 50, 80, 50, 80];
        const colX = [leftMargin + 5, leftMargin + 35, leftMargin + 185, leftMargin + 255, leftMargin + 305, leftMargin + 385, leftMargin + 435];

        // Draw header row
        doc.rect(leftMargin, tableTop, rightMargin - leftMargin, 18).stroke();
        doc.font('Helvetica-Bold').fontSize(7);
        doc.text('Sl No', colX[0], tableTop + 5, { width: colWidths[0], align: 'center' });
        doc.text('Description', colX[1], tableTop + 5, { width: colWidths[1] });
        doc.text('Value', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
        doc.text('Units', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
        doc.text('Sum Insured', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
        doc.text('Rate %', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });
        doc.text('Premium', colX[6], tableTop + 5, { width: colWidths[6], align: 'right' });

        yPos = tableTop + 18;

        // Draw data rows
        doc.font('Helvetica').fontSize(7);
        propertyItems.forEach((item) => {
          const rowHeight = 16;
          doc.rect(leftMargin, yPos, rightMargin - leftMargin, rowHeight).stroke();

          doc.text(item.slNo.toString(), colX[0], yPos + 4, { width: colWidths[0], align: 'center' });
          doc.text(item.description || '', colX[1], yPos + 4, { width: colWidths[1] });
          doc.text(formatCurrency(item.value || 0), colX[2], yPos + 4, { width: colWidths[2], align: 'right' });
          doc.text((item.noOfUnits || 0).toString(), colX[3], yPos + 4, { width: colWidths[3], align: 'right' });
          doc.text(formatCurrency(item.sumInsured || 0), colX[4], yPos + 4, { width: colWidths[4], align: 'right' });
          doc.text(`${item.rate}%`, colX[5], yPos + 4, { width: colWidths[5], align: 'right' });
          doc.text(formatCurrency(item.premium || 0), colX[6], yPos + 4, { width: colWidths[6], align: 'right' });

          yPos += rowHeight;
        });

        // Total row
        const totalPremium = propertyItems.reduce((sum, item) => sum + (item.premium || 0), 0);
        doc.font('Helvetica-Bold');
        doc.rect(leftMargin, yPos, rightMargin - leftMargin, 16).stroke();
        doc.text('TOTAL', colX[1], yPos + 4, { width: colWidths[1] });
        doc.text(formatCurrency(totalPremium), colX[6], yPos + 4, { width: colWidths[6], align: 'right' });
        yPos += 16;

      } else if (itemType === 'public_liability') {
        // Public Liability table
        const tableTop = yPos;
        const colWidths = [30, 130, 110, 80, 60, 40, 60];
        const colX = [leftMargin + 5, leftMargin + 35, leftMargin + 165, leftMargin + 275, leftMargin + 355, leftMargin + 415, leftMargin + 455];

        doc.rect(leftMargin, tableTop, rightMargin - leftMargin, 18).stroke();
        doc.font('Helvetica-Bold').fontSize(7);
        doc.text('Sl No', colX[0], tableTop + 5, { width: colWidths[0], align: 'center' });
        doc.text('Description', colX[1], tableTop + 5, { width: colWidths[1] });
        doc.text('Details', colX[2], tableTop + 5, { width: colWidths[2] });
        doc.text('Max Liability', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
        doc.text('AOA:AOY', colX[4], tableTop + 5, { width: colWidths[4], align: 'center' });
        doc.text('Rate %', colX[5], tableTop + 5, { width: colWidths[5], align: 'right' });
        doc.text('Premium', colX[6], tableTop + 5, { width: colWidths[6], align: 'right' });

        yPos = tableTop + 18;

        doc.font('Helvetica').fontSize(7);
        propertyItems.forEach((item) => {
          const rowHeight = 16;
          doc.rect(leftMargin, yPos, rightMargin - leftMargin, rowHeight).stroke();

          doc.text(item.slNo.toString(), colX[0], yPos + 4, { width: colWidths[0], align: 'center' });
          doc.text(item.description || '', colX[1], yPos + 4, { width: colWidths[1] });
          doc.text(item.details || '', colX[2], yPos + 4, { width: colWidths[2] });
          doc.text(formatCurrency(item.maxLiability || 0), colX[3], yPos + 4, { width: colWidths[3], align: 'right' });
          doc.text(`${item.aoaAmount || 0}:${item.aoyAmount || 0}`, colX[4], yPos + 4, { width: colWidths[4], align: 'center' });
          doc.text(`${item.rate}%`, colX[5], yPos + 4, { width: colWidths[5], align: 'right' });
          doc.text(formatCurrency(item.premium || 0), colX[6], yPos + 4, { width: colWidths[6], align: 'right' });

          yPos += rowHeight;
        });

        const totalPremium = propertyItems.reduce((sum, item) => sum + (item.premium || 0), 0);
        doc.font('Helvetica-Bold');
        doc.rect(leftMargin, yPos, rightMargin - leftMargin, 16).stroke();
        doc.text('TOTAL', colX[1], yPos + 4, { width: colWidths[1] });
        doc.text(formatCurrency(totalPremium), colX[6], yPos + 4, { width: colWidths[6], align: 'right' });
        yPos += 16;

      } else if (itemType === 'business_interruption') {
        // Business Interruption table (simplified for space)
        const tableTop = yPos;
        const colWidths = [25, 110, 70, 70, 70, 45, 35, 55];
        const colX = [leftMargin + 5, leftMargin + 30, leftMargin + 140, leftMargin + 210, leftMargin + 280, leftMargin + 350, leftMargin + 395, leftMargin + 430];

        doc.rect(leftMargin, tableTop, rightMargin - leftMargin, 18).stroke();
        doc.font('Helvetica-Bold').fontSize(6);
        doc.text('Sl', colX[0], tableTop + 5, { width: colWidths[0], align: 'center' });
        doc.text('Description', colX[1], tableTop + 5, { width: colWidths[1] });
        doc.text('Gross Profit', colX[2], tableTop + 5, { width: colWidths[2], align: 'right' });
        doc.text('Net Profit', colX[3], tableTop + 5, { width: colWidths[3], align: 'right' });
        doc.text('Standing Chg', colX[4], tableTop + 5, { width: colWidths[4], align: 'right' });
        doc.text('Period', colX[5], tableTop + 5, { width: colWidths[5], align: 'center' });
        doc.text('Rate %', colX[6], tableTop + 5, { width: colWidths[6], align: 'right' });
        doc.text('Premium', colX[7], tableTop + 5, { width: colWidths[7], align: 'right' });

        yPos = tableTop + 18;

        doc.font('Helvetica').fontSize(6);
        propertyItems.forEach((item) => {
          const rowHeight = 16;
          doc.rect(leftMargin, yPos, rightMargin - leftMargin, rowHeight).stroke();

          doc.text(item.slNo.toString(), colX[0], yPos + 4, { width: colWidths[0], align: 'center' });
          doc.text(item.description || '', colX[1], yPos + 4, { width: colWidths[1] });
          doc.text(formatCurrency(item.grossProfit || 0), colX[2], yPos + 4, { width: colWidths[2], align: 'right' });
          doc.text(formatCurrency(item.netProfit || 0), colX[3], yPos + 4, { width: colWidths[3], align: 'right' });
          doc.text(formatCurrency(item.standingCharges || 0), colX[4], yPos + 4, { width: colWidths[4], align: 'right' });
          doc.text(`${item.indemnityPeriodMonths || 0}m`, colX[5], yPos + 4, { width: colWidths[5], align: 'center' });
          doc.text(`${item.rate}%`, colX[6], yPos + 4, { width: colWidths[6], align: 'right' });
          doc.text(formatCurrency(item.premium || 0), colX[7], yPos + 4, { width: colWidths[7], align: 'right' });

          yPos += rowHeight;
        });

        const totalPremium = propertyItems.reduce((sum, item) => sum + (item.premium || 0), 0);
        doc.font('Helvetica-Bold');
        doc.rect(leftMargin, yPos, rightMargin - leftMargin, 16).stroke();
        doc.text('TOTAL', colX[1], yPos + 4, { width: colWidths[1] });
        doc.text(formatCurrency(totalPremium), colX[7], yPos + 4, { width: colWidths[7], align: 'right' });
        yPos += 16;
      }

    } else {
      doc.fontSize(10).font('Helvetica');
      doc.text('Property details to be provided', leftMargin + 10, yPos);
      yPos += lineHeight;
    }

    // ==================== SECTION 4: PREMIUM DETAILS ====================
    yPos += 12;
    doc.fontSize(11).font('Helvetica-Bold').text('4. PREMIUM DETAILS', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    const grossPremium = Number(policy.grossPremium) || 0;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Gross Premium: ${formatCurrency(grossPremium)}`, leftMargin + 10, yPos);

    // ==================== SECTION 5: BROKER'S REMUNERATION ====================
    yPos += 18;
    doc.fontSize(11).font('Helvetica-Bold').text('5. BROKER\'S REMUNERATION', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    // Calculate brokerage (use LOB default or Sub-LOB override)
    const brokeragePct = subLob?.overrideBrokeragePct ?? lob?.defaultBrokeragePct ?? 0;
    const brokerageAmount = (grossPremium * brokeragePct) / 100;
    const vatPct = subLob?.overrideVatPct ?? lob?.defaultVatPct ?? 7.5;
    const vatAmount = (brokerageAmount * vatPct) / 100;
    const netToInsurer = grossPremium - brokerageAmount - vatAmount;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Brokerage (${brokeragePct.toFixed(2)}%): ${formatCurrency(brokerageAmount)}`, leftMargin + 10, yPos);
    yPos += lineHeight;
    doc.text(`VAT on Brokerage (${vatPct.toFixed(2)}%): ${formatCurrency(vatAmount)}`, leftMargin + 10, yPos);
    yPos += lineHeight;
    doc.font('Helvetica-Bold');
    doc.text(`Net Premium to Insurer: ${formatCurrency(netToInsurer)}`, leftMargin + 10, yPos);
    doc.font('Helvetica');

    // ==================== SECTION 6: CO-INSURANCE SHARES ====================
    yPos += 18;
    doc.fontSize(11).font('Helvetica-Bold').text('6. PROPOSED CO-INSURANCE SHARES', leftMargin, yPos);
    yPos += lineHeight + 2;

    if (coInsuranceShares && coInsuranceShares.length > 0) {
      // Draw table for co-insurance shares
      const tableTop = yPos;
      const col1Width = 350;
      const col2Width = rightMargin - leftMargin - col1Width;

      doc.rect(leftMargin, tableTop, rightMargin - leftMargin, 18).stroke();
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Insurance Company', leftMargin + 5, tableTop + 5, { width: col1Width });
      doc.text('Share %', leftMargin + col1Width + 5, tableTop + 5, { width: col2Width, align: 'right' });

      yPos = tableTop + 18;

      doc.font('Helvetica').fontSize(9);
      let totalShare = 0;
      coInsuranceShares.forEach((share) => {
        const rowHeight = 16;
        doc.rect(leftMargin, yPos, rightMargin - leftMargin, rowHeight).stroke();
        doc.text(share.insurer?.companyName || share.insurer?.shortName || 'Unknown', leftMargin + 5, yPos + 4, { width: col1Width });
        doc.text(`${share.sharePercentage.toFixed(2)}%`, leftMargin + col1Width + 5, yPos + 4, { width: col2Width, align: 'right' });
        totalShare += share.sharePercentage;
        yPos += rowHeight;
      });

      // Total row
      doc.font('Helvetica-Bold');
      doc.rect(leftMargin, yPos, rightMargin - leftMargin, 16).stroke();
      doc.text('TOTAL', leftMargin + 5, yPos + 4, { width: col1Width });
      doc.text(`${totalShare.toFixed(2)}%`, leftMargin + col1Width + 5, yPos + 4, { width: col2Width, align: 'right' });
      yPos += 16;

    } else {
      // Fallback to single insurer
      doc.fontSize(10).font('Helvetica');
      doc.text(`Primary Insurer: ${insurer?.companyName || insurer?.legalName || 'TBA'}`, leftMargin + 10, yPos);
      yPos += lineHeight;
      doc.text(`Share: 100.00%`, leftMargin + 10, yPos);
      yPos += lineHeight;
    }

    // ==================== SECTION 7: DECLARATION ====================
    yPos += 18;
    doc.fontSize(11).font('Helvetica-Bold').text('7. DECLARATION', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    doc.fontSize(9).font('Helvetica');
    const declarations = [
      'We hereby declare that all material facts have been disclosed to the best of our knowledge.',
      'The Insured hereby authorizes the Broker to place this risk with the Insurer mentioned above.',
      'All policy terms and conditions are subject to the Insurer\'s acceptance and approval.',
      'This broking slip is valid until ' + formatDate(policy.slipValidUntil) + '.'
    ];
    
    declarations.forEach((decl) => {
      doc.text(`• ${decl}`, leftMargin + 10, yPos, { width: pageWidth - 100 });
      yPos += lineHeight + 2;
    });

    // ==================== SECTION 8: SIGNATURES ====================
    yPos += 15;
    doc.fontSize(10).font('Helvetica-Bold').text('FOR AND ON BEHALF OF THE INSURED:', leftMargin, yPos);
    yPos += 25;
    
    doc.fontSize(9).font('Helvetica');
    doc.text('_____________________________', leftMargin, yPos);
    doc.text('_____________________________', rightMargin - 150, yPos);
    yPos += lineHeight;
    doc.text('Signature', leftMargin, yPos);
    doc.text('Date', rightMargin - 150, yPos);

    yPos += 25;
    doc.fontSize(10).font('Helvetica-Bold').text('PREPARED BY (BROKER):', leftMargin, yPos);
    yPos += 25;
    
    doc.fontSize(9).font('Helvetica');
    doc.text('Mutual Equity Insurance Broking Ltd.', leftMargin, yPos);
    yPos += lineHeight;
    doc.text('_____________________________', leftMargin, yPos);
    yPos += lineHeight;
    doc.text('Authorized Signatory', leftMargin, yPos);

    // ==================== FOOTER ====================
    const footerY = pageHeight - 50;
    doc.fontSize(7)
       .font('Helvetica-Oblique')
       .text('Licensed by NAICOM & NCRIB | RC Number: 123456', leftMargin, footerY, { align: 'center', width: pageWidth - 80 });

    doc.end();
  });
}

/**
 * GET /api/policies/[id]/broking-slip
 * Download Broking Slip PDF for a policy
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const policyId = parseInt(params.id);

    if (isNaN(policyId)) {
      return NextResponse.json(
        { error: 'Invalid policy ID' },
        { status: 400 }
      );
    }

    // Fetch policy with all related data
    const result = await db.select({
      policy: policies,
      client: clients,
      insurer: insurers,
      lob: lobs,
      subLob: subLobs,
    })
      .from(policies)
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .leftJoin(insurers, eq(policies.insurerId, insurers.id))
      .leftJoin(lobs, eq(policies.lobId, lobs.id))
      .leftJoin(subLobs, eq(policies.subLobId, subLobs.id))
      .where(eq(policies.id, policyId))
      .limit(1);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const data = result[0];

    // Check if slip number exists
    if (!data.policy.slipNumber) {
      return NextResponse.json(
        { error: 'Broking slip not yet generated for this policy. Please generate slip number first.' },
        { status: 400 }
      );
    }

    // Fetch property items
    const propertyItemsResult = await db.select()
      .from(policyPropertyItems)
      .where(eq(policyPropertyItems.policyId, policyId))
      .orderBy(asc(policyPropertyItems.slNo));

    // Fetch co-insurance shares with insurer details
    const coInsuranceSharesResult = await db.select({
      share: policyCoInsuranceShares,
      insurer: insurers,
    })
      .from(policyCoInsuranceShares)
      .leftJoin(insurers, eq(policyCoInsuranceShares.insurerId, insurers.id))
      .where(eq(policyCoInsuranceShares.policyId, policyId));

    // Transform co-insurance shares to include insurer data
    const coInsuranceShares = coInsuranceSharesResult.map(item => ({
      ...item.share,
      insurer: item.insurer,
    }));

    // Generate PDF
    const pdfBuffer = await generateBrokingSlipPDF({
      ...data,
      propertyItems: propertyItemsResult,
      coInsuranceShares,
    });
    const filename = `Broking-Slip-${data.policy.slipNumber.replace(/\//g, '-')}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error generating broking slip PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate broking slip PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
