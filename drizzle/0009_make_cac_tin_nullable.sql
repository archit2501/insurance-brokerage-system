-- Migration: Make CAC/RC and TIN nullable for Individual clients
-- Date: 2025-10-17
-- Reason: Individual clients don't have CAC/RC numbers, only Companies do

-- SQLite doesn't support ALTER COLUMN directly, so we need to:
-- 1. Create a new table with the correct schema
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- Drop existing unique indexes first
DROP INDEX IF EXISTS `clients_cac_rc_number_unique`;
DROP INDEX IF EXISTS `clients_tin_unique`;

-- Create new clients table with nullable CAC/RC and TIN
CREATE TABLE `clients_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_code` text UNIQUE,
	`company_name` text NOT NULL,
	`client_type` text DEFAULT 'Company' NOT NULL,
	`cac_rc_number` text,
	`tin` text,
	`industry` text,
	`address` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'Nigeria',
	`website` text,
	`kyc_status` text DEFAULT 'pending' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Copy all existing data
INSERT INTO clients_new 
SELECT * FROM clients;

-- Drop old table
DROP TABLE clients;

-- Rename new table to clients
ALTER TABLE clients_new RENAME TO clients;

-- Recreate unique indexes (allowing NULL values)
CREATE UNIQUE INDEX `clients_cac_rc_number_unique` ON `clients` (`cac_rc_number`) WHERE `cac_rc_number` IS NOT NULL;
CREATE UNIQUE INDEX `clients_tin_unique` ON `clients` (`tin`) WHERE `tin` IS NOT NULL;
CREATE UNIQUE INDEX `clients_client_code_unique` ON `clients` (`client_code`) WHERE `client_code` IS NOT NULL;
