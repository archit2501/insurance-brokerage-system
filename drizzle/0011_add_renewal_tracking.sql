-- Add renewal tracking fields to policies table
ALTER TABLE policies ADD COLUMN is_renewal INTEGER DEFAULT 0;
ALTER TABLE policies ADD COLUMN renewed_from_policy_id INTEGER;
ALTER TABLE policies ADD COLUMN renewed_to_policy_id INTEGER;
ALTER TABLE policies ADD COLUMN renewal_reminder_sent INTEGER DEFAULT 0;

-- Create index for renewal tracking
CREATE INDEX IF NOT EXISTS idx_policies_renewal_from ON policies(renewed_from_policy_id);
CREATE INDEX IF NOT EXISTS idx_policies_renewal_to ON policies(renewed_to_policy_id);
CREATE INDEX IF NOT EXISTS idx_policies_expiry ON policies(policy_end_date);
