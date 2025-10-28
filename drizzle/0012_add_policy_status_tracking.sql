-- Add policy status tracking fields
ALTER TABLE policies ADD COLUMN last_status_check TEXT;
ALTER TABLE policies ADD COLUMN auto_expired INTEGER DEFAULT 0;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_auto_expired ON policies(auto_expired);
