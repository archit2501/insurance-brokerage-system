import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/claims/statistics
 * Get claims statistics for dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    const dateConditions = [];
    if (dateFrom) {
      dateConditions.push(gte(claims.createdAt, dateFrom));
    }
    if (dateTo) {
      dateConditions.push(lte(claims.createdAt, dateTo));
    }

    const whereClause = dateConditions.length > 0 ? and(...dateConditions) : undefined;

    // Get all claims matching date filter
    const allClaims = whereClause 
      ? await db.select().from(claims).where(whereClause)
      : await db.select().from(claims);

    // Calculate statistics
    const totalClaims = allClaims.length;
    const totalClaimAmount = allClaims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
    const totalSettledAmount = allClaims
      .filter(c => c.status === 'Settled')
      .reduce((sum, c) => sum + (c.settlementAmount || 0), 0);

    // Claims by status
    const claimsByStatus = allClaims.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Claims by priority
    const claimsByPriority = allClaims.reduce((acc, c) => {
      acc[c.priority] = (acc[c.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average settlement time (days between reported and settled)
    const settledClaims = allClaims.filter(c => c.status === 'Settled' && c.settlementDate);
    let avgSettlementDays = 0;
    if (settledClaims.length > 0) {
      const totalDays = settledClaims.reduce((sum, c) => {
        const reported = new Date(c.reportedDate);
        const settled = new Date(c.settlementDate!);
        const days = Math.floor((settled.getTime() - reported.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgSettlementDays = Math.round(totalDays / settledClaims.length);
    }

    // Settlement ratio
    const settledCount = claimsByStatus['Settled'] || 0;
    const rejectedCount = claimsByStatus['Rejected'] || 0;
    const totalProcessed = settledCount + rejectedCount;
    const settlementRatio = totalProcessed > 0 ? ((settledCount / totalProcessed) * 100).toFixed(1) : '0.0';

    // Open claims (not settled, not rejected, not closed)
    const openStatuses = ['Registered', 'UnderInvestigation', 'Approved'];
    const openClaimsCount = openStatuses.reduce((sum, status) => sum + (claimsByStatus[status] || 0), 0);

    return NextResponse.json({
      totalClaims,
      openClaimsCount,
      totalClaimAmount,
      totalSettledAmount,
      avgSettlementDays,
      settlementRatio: parseFloat(settlementRatio),
      claimsByStatus: {
        Registered: claimsByStatus['Registered'] || 0,
        UnderInvestigation: claimsByStatus['UnderInvestigation'] || 0,
        Approved: claimsByStatus['Approved'] || 0,
        Rejected: claimsByStatus['Rejected'] || 0,
        Settled: claimsByStatus['Settled'] || 0,
        Closed: claimsByStatus['Closed'] || 0,
      },
      claimsByPriority: {
        Low: claimsByPriority['Low'] || 0,
        Medium: claimsByPriority['Medium'] || 0,
        High: claimsByPriority['High'] || 0,
        Critical: claimsByPriority['Critical'] || 0,
      },
    });
  } catch (error: any) {
    console.error('GET /api/claims/statistics error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch statistics'
    }, { status: 500 });
  }
}
