-- Migration: Add Property Items and Co-Insurance Shares for Broking Slip
-- Created: 2025-10-25

-- Policy Property Items table (line items for different LOB types)
CREATE TABLE IF NOT EXISTS policy_property_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id INTEGER NOT NULL REFERENCES policies(id),
  sl_no INTEGER NOT NULL,
  item_type TEXT NOT NULL,

  -- Common fields
  description TEXT NOT NULL,
  details TEXT,

  -- Fire & Special Perils fields
  value REAL,
  no_of_units REAL,
  sum_insured REAL,

  -- Public Liability fields
  max_liability REAL,
  aoa_amount REAL,
  aoy_amount REAL,

  -- Business Interruption fields
  gross_profit REAL,
  net_profit REAL,
  standing_charges REAL,
  auditor_fees REAL,
  increased_cost_of_working REAL,
  indemnity_period_months INTEGER,

  -- Common calculation fields
  rate REAL NOT NULL,
  premium REAL NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS policy_property_items_policy_idx ON policy_property_items(policy_id);

-- Policy Co-Insurance Shares table (for proposed shares in broking slip)
CREATE TABLE IF NOT EXISTS policy_co_insurance_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id INTEGER NOT NULL REFERENCES policies(id),
  insurer_id INTEGER NOT NULL REFERENCES insurers(id),
  share_percentage REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS policy_co_insurance_shares_policy_idx ON policy_co_insurance_shares(policy_id);
