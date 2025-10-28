import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { and, eq, lte, isNull, or } from "drizzle-orm";

/**
 * POST /api/policies/auto-expire
 * 
 * Automatically marks policies as expired if their end date has passed.
 * This endpoint should be called periodically (e.g., via cron job or manual trigger).
 * 
 * Query Parameters:
 * - dryRun: boolean (default: false) - If true, only returns what would be expired without updating
 * 
 * Response:
 * {
 *   success: true,
 *   expired: number,
 *   policies: [{ id, policyNumber, policyEndDate, client, status }],
 *   dryRun: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Find all policies that:
    // 1. Have end date in the past (or today)
    // 2. Status is NOT already "expired" or "cancelled"
    // 3. Have not been auto-expired yet (to track manual vs auto-expiry)
    const expiredPolicies = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        policyEndDate: policies.policyEndDate,
        status: policies.status,
        clientId: policies.clientId,
        insurerId: policies.insurerId,
        grossPremium: policies.grossPremium,
        currency: policies.currency,
        autoExpired: policies.autoExpired,
      })
      .from(policies)
      .where(
        and(
          lte(policies.policyEndDate, today),
          // Status is active or pending (not already expired/cancelled)
          or(
            eq(policies.status, "active"),
            eq(policies.status, "pending"),
            isNull(policies.status)
          ),
          // Not already auto-expired
          or(
            eq(policies.autoExpired, false),
            isNull(policies.autoExpired)
          )
        )
      );

    if (dryRun) {
      return NextResponse.json({
        success: true,
        expired: expiredPolicies.length,
        policies: expiredPolicies,
        dryRun: true,
        message: `Would expire ${expiredPolicies.length} policies (dry run mode)`,
      });
    }

    // Update all expired policies
    const updatePromises = expiredPolicies.map((policy) =>
      db
        .update(policies)
        .set({
          status: "expired",
          autoExpired: true,
          lastStatusCheck: now,
          updatedAt: now,
        })
        .where(eq(policies.id, policy.id))
    );

    await Promise.all(updatePromises);

    // Get updated policy details with relations
    const updatedPolicies = await db.query.policies.findMany({
      where: (p, { inArray }) => inArray(p.id, expiredPolicies.map(ep => ep.id)),
      with: {
        client: {
          columns: {
            id: true,
            companyName: true,
            clientCode: true,
          },
        },
        insurer: {
          columns: {
            id: true,
            companyName: true,
            shortName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      expired: expiredPolicies.length,
      policies: updatedPolicies,
      dryRun: false,
      timestamp: now,
      message: `Successfully expired ${expiredPolicies.length} policies`,
    });
  } catch (error: any) {
    console.error("Auto-expire error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to auto-expire policies",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/policies/auto-expire
 * 
 * Check which policies would be expired (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const expiredPolicies = await db.query.policies.findMany({
      where: (p, { and, lte, or, eq, isNull }) => and(
        lte(p.policyEndDate, today),
        or(
          eq(p.status, "active"),
          eq(p.status, "pending"),
          isNull(p.status)
        ),
        or(
          eq(p.autoExpired, false),
          isNull(p.autoExpired)
        )
      ),
      with: {
        client: {
          columns: {
            id: true,
            companyName: true,
            clientCode: true,
          },
        },
        insurer: {
          columns: {
            id: true,
            companyName: true,
            shortName: true,
          },
        },
      },
    });

    // Calculate how many days expired
    const enrichedPolicies = expiredPolicies.map(policy => {
      const endDate = new Date(policy.policyEndDate);
      const todayDate = new Date(today);
      const daysExpired = Math.floor((todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...policy,
        daysExpired,
      };
    });

    return NextResponse.json({
      success: true,
      count: expiredPolicies.length,
      policies: enrichedPolicies,
      message: `Found ${expiredPolicies.length} policies eligible for auto-expiry`,
    });
  } catch (error: any) {
    console.error("Auto-expire check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check expired policies",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
