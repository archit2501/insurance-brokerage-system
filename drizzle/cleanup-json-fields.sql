-- Clean up invalid JSON data in lobs and sub_lobs tables
-- This fixes the "rating_inputs is not valid JSON" error

-- Update lobs table - set invalid JSON to NULL
UPDATE lobs 
SET rating_inputs = NULL 
WHERE rating_inputs IS NOT NULL 
  AND rating_inputs NOT LIKE '{%' 
  AND rating_inputs NOT LIKE '[%';

-- Update sub_lobs table - set invalid JSON to NULL  
UPDATE sub_lobs 
SET override_rating_inputs = NULL 
WHERE override_rating_inputs IS NOT NULL 
  AND override_rating_inputs NOT LIKE '{%' 
  AND override_rating_inputs NOT LIKE '[%';

-- Verify cleanup
SELECT 'LOBs with clean rating_inputs:' as status, COUNT(*) as count FROM lobs;
SELECT 'Sub-LOBs with clean override_rating_inputs:' as status, COUNT(*) as count FROM sub_lobs;