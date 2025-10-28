import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/policies/import/template
 * Download CSV template for policy import
 */
export async function GET(req: NextRequest) {
  try {
    // CSV template with headers and example rows
    const csvContent = `clientCode,insurerCode,lobCode,sumInsured,grossPremium,policyStartDate,policyEndDate,currency
CLI/2024/000001,INS/2024/000001,MOTOR,5000000,150000,2024-01-01,2024-12-31,NGN
CLI/2024/000002,INS/2024/000002,FIRE,10000000,250000,2024-02-01,2025-01-31,NGN
CLI/2024/000003,INS/2024/000003,MARINE,3000000,90000,2024-03-01,2025-02-28,USD`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="policy_import_template.csv"',
      },
    });
  } catch (error: any) {
    console.error('GET /api/policies/import/template error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate template'
    }, { status: 500 });
  }
}
