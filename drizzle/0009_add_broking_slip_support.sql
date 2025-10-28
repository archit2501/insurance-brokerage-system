-- Add broking slip fields to policies table
ALTER TABLE policies ADD COLUMN slip_number TEXT;
ALTER TABLE policies ADD COLUMN slip_status TEXT;
ALTER TABLE policies ADD COLUMN slip_generated_at TEXT;
ALTER TABLE policies ADD COLUMN slip_valid_until TEXT;
ALTER TABLE policies ADD COLUMN risk_details TEXT;
ALTER TABLE policies ADD COLUMN submitted_to_insurer_at TEXT;
ALTER TABLE policies ADD COLUMN insurer_response_at TEXT;
ALTER TABLE policies ADD COLUMN placement_proportion REAL DEFAULT 100;

-- Create unique index on slip_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_slip_number ON policies(slip_number) WHERE slip_number IS NOT NULL;

-- Create slip_sequences table for broking slip numbering
CREATE TABLE IF NOT EXISTS slip_sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create unique index on year
CREATE UNIQUE INDEX IF NOT EXISTS unique_slip_year ON slip_sequences(year);
