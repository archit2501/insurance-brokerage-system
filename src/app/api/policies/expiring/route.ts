import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { policies, clients, insurers, lobs } from '@/db/schema';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { authenticateRequest } from '@/app/api/_lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '60'); // Default: 60 days
    const status = searchParams.get('status') || 'active';

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Find policies expiring within the period that haven't been renewed
    const expiringPolicies = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        clientId: policies.clientId,
        insurerId: policies.insurerId,
        lobId: policies.lobId,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium,
        currency: policies.currency,
        policyStartDate: policies.policyStartDate,
        policyEndDate: policies.policyEndDate,
        status: policies.status,
        isRenewal: policies.isRenewal,
        renewedFromPolicyId: policies.renewedFromPolicyId,
        renewedToPolicyId: policies.renewedToPolicyId,
        renewalReminderSent: policies.renewalReminderSent,
        client: {
          id: clients.id,
          companyName: clients.companyName,
        },
        insurer: {
          id: insurers.id,
          companyName: insurers.companyName,
          shortName: insurers.shortName,
        },
        lob: {
          id: lobs.id,
          name: lobs.name,
        },
      })
      .from(policies)
      .leftJoin(clients, eq(policies.clientId, clients.id))
      .leftJoin(insurers, eq(policies.insurerId, insurers.id))
      .leftJoin(lobs, eq(policies.lobId, lobs.id))
      .where(
        and(
          eq(policies.status, status),
          gte(policies.policyEndDate, todayStr),
          lte(policies.policyEndDate, futureDateStr),
          isNull(policies.renewedToPolicyId) // Not yet renewed
        )
      )
      .orderBy(policies.policyEndDate);

    // Calculate days until expiry for each policy
    const enrichedPolicies = expiringPolicies.map(policy => {
      const expiryDate = new Date(policy.policyEndDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...policy,
        daysUntilExpiry,
        urgency: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 30 ? 'high' : 'medium',
      };
    });

    // Group by urgency
    const summary = {
      total: enrichedPolicies.length,
      critical: enrichedPolicies.filter(p => p.urgency === 'critical').length,
      high: enrichedPolicies.filter(p => p.urgency === 'high').length,
      medium: enrichedPolicies.filter(p => p.urgency === 'medium').length,
      totalPremiumAtRisk: enrichedPolicies.reduce((sum, p) => sum + Number(p.grossPremium), 0),
    };

    return NextResponse.json({
      summary,
      policies: enrichedPolicies,
      dateRange: {
        from: todayStr,
        to: futureDateStr,
        days,
      },
    });
  } catch (error) {
    console.error('Get expiring policies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring policies' },
      { status: 500 }
    );
  }
}
