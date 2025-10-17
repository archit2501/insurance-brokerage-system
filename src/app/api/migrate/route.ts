import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('📦 Applying schema migration...');

    // Helper to safely add column
    const addColumn = async (table: string, column: string, definition: string) => {
      try {
        await db.run(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`));
        console.log(`✅ Added ${table}.${column}`);
      } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
          console.log(`⏭️  Column ${table}.${column} already exists`);
        } else {
          console.error(`❌ Failed to add ${table}.${column}:`, e.message);
        }
      }
    };

    // Add missing columns to lobs table (without NOT NULL for existing tables)
    await addColumn('lobs', 'default_brokerage_pct', 'real DEFAULT 0');
    await addColumn('lobs', 'default_vat_pct', 'real DEFAULT 7.5');
    await addColumn('lobs', 'rate_basis', 'text');
    await addColumn('lobs', 'rating_inputs', 'text');
    await addColumn('lobs', 'min_premium', 'real DEFAULT 0');
    await addColumn('lobs', 'wording_refs', 'text');

    // Update NULL values to defaults for lobs
    try {
      await db.run(sql`UPDATE lobs SET default_brokerage_pct = 0 WHERE default_brokerage_pct IS NULL`);
      await db.run(sql`UPDATE lobs SET default_vat_pct = 7.5 WHERE default_vat_pct IS NULL`);
      await db.run(sql`UPDATE lobs SET min_premium = 0 WHERE min_premium IS NULL`);
      console.log('✅ Updated NULL values in lobs table');
    } catch (e) {
      console.log('⏭️  lobs table values already updated');
    }

    // Add missing columns to insurers table
    await addColumn('insurers', 'insurer_code', 'text');
    await addColumn('insurers', 'license_expiry', "text DEFAULT '2099-12-31'");
    await addColumn('insurers', 'special_lobs', 'text');
    await addColumn('insurers', 'created_by', 'integer');
    await addColumn('insurers', 'updated_by', 'integer');
    
    try {
      await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS insurers_insurer_code_unique ON insurers (insurer_code)`);
    } catch (e) {
      console.log('⏭️  Index insurers_insurer_code_unique already exists');
    }

    // Add missing columns to sub_lobs table
    await addColumn('sub_lobs', 'override_brokerage_pct', 'real');
    await addColumn('sub_lobs', 'override_vat_pct', 'real');
    await addColumn('sub_lobs', 'override_min_premium', 'real');
    await addColumn('sub_lobs', 'override_rate_basis', 'text');
    await addColumn('sub_lobs', 'override_rating_inputs', 'text');
    await addColumn('sub_lobs', 'wording_refs', 'text');

    // Add missing columns to clients table
    await addColumn('clients', 'client_type', "text DEFAULT 'Company'");

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Database schema updated successfully'
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}