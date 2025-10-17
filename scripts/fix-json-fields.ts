import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function fixJsonFields() {
  try {
    console.log('🔧 Cleaning up invalid JSON data...');
    
    // Clean up lobs table
    await db.run(sql`
      UPDATE lobs 
      SET rating_inputs = NULL 
      WHERE rating_inputs IS NOT NULL 
        AND rating_inputs NOT LIKE '{%' 
        AND rating_inputs NOT LIKE '[%'
    `);
    
    // Clean up sub_lobs table
    await db.run(sql`
      UPDATE sub_lobs 
      SET override_rating_inputs = NULL 
      WHERE override_rating_inputs IS NOT NULL 
        AND override_rating_inputs NOT LIKE '{%' 
        AND override_rating_inputs NOT LIKE '[%'
    `);
    
    console.log('✅ JSON fields cleaned up successfully!');
    console.log('✅ You can now create LOBs and Sub-LOBs without errors.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up JSON fields:', error);
    process.exit(1);
  }
}

fixJsonFields();