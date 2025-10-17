import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lobs, subLobs } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting data cleanup operation...');

    // Perform cleanup operations directly using raw SQL
    const lobsUpdateResult = await db.run(sql`
      UPDATE lobs 
      SET rating_inputs = NULL, 
          updated_at = ${new Date().toISOString()}
      WHERE rating_inputs = 'rating_inputs'
    `);

    const subLobsUpdateResult = await db.run(sql`
      UPDATE sub_lobs 
      SET override_rating_inputs = NULL, 
          updated_at = ${new Date().toISOString()}
      WHERE override_rating_inputs = 'override_rating_inputs'
    `);

    const lobsUpdated = lobsUpdateResult.changes || 0;
    const subLobsUpdated = subLobsUpdateResult.changes || 0;

    console.log(`Updated ${lobsUpdated} rows in lobs table`);
    console.log(`Updated ${subLobsUpdated} rows in sub_lobs table`);

    // Also clean up any other placeholder values
    const additionalLobsCleanup = await db.run(sql`
      UPDATE lobs 
      SET default_brokerage_pct = 10.0,
          default_vat_pct = 7.5,
          min_premium = 5000.0,
          rate_basis = NULL,
          wording_refs = NULL,
          updated_at = ${new Date().toISOString()}
      WHERE default_brokerage_pct = 'default_brokerage_pct'
         OR default_vat_pct = 'default_vat_pct'  
         OR min_premium = 'min_premium'
         OR rate_basis = 'rate_basis'
         OR wording_refs = 'wording_refs'
    `);

    const additionalLobsFixed = additionalLobsCleanup.changes || 0;

    // Prepare cleanup summary
    const summary = {
      success: true,
      message: 'Data cleanup completed successfully',
      operations: {
        lobs: {
          ratingInputsFixed: lobsUpdated,
          additionalFieldsFixed: additionalLobsFixed,
          actions: [
            'Set rating_inputs to NULL where value was "rating_inputs"',
            'Fixed placeholder values for default_brokerage_pct, default_vat_pct, min_premium, rate_basis, wording_refs'
          ]
        },
        subLobs: {
          overrideRatingInputsFixed: subLobsUpdated,
          actions: [
            'Set override_rating_inputs to NULL where value was "override_rating_inputs"'
          ]
        }
      },
      totalRowsAffected: lobsUpdated + subLobsUpdated + additionalLobsFixed,
      schemaUpdates: [
        'rating_inputs column changed from JSON mode to plain TEXT',
        'override_rating_inputs column changed from JSON mode to plain TEXT'
      ],
      timestamp: new Date().toISOString()
    };

    console.log('Cleanup summary:', summary);

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    console.error('Data cleanup error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform data cleanup operation',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}