-- Enhance Credit Note/Debit Note functionality
-- Add payment terms, LOB-specific details, and other enhancements

-- Add new fields to notes table
ALTER TABLE notes ADD COLUMN payment_terms TEXT;
ALTER TABLE notes ADD COLUMN payment_due_date TEXT;
ALTER TABLE notes ADD COLUMN lob_specific_details TEXT;
ALTER TABLE notes ADD COLUMN special_conditions TEXT;
ALTER TABLE notes ADD COLUMN endorsement_details TEXT;
ALTER TABLE notes ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE notes ADD COLUMN exchange_rate REAL DEFAULT 1.0;
ALTER TABLE notes ADD COLUMN issue_date TEXT;

-- No indexes needed for these fields as they are primarily for display
