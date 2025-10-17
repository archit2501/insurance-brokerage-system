-- Add missing columns to lobs table
ALTER TABLE `lobs` ADD COLUMN `default_brokerage_pct` real DEFAULT 0 NOT NULL;
ALTER TABLE `lobs` ADD COLUMN `default_vat_pct` real DEFAULT 7.5 NOT NULL;
ALTER TABLE `lobs` ADD COLUMN `rate_basis` text;
ALTER TABLE `lobs` ADD COLUMN `rating_inputs` text;
ALTER TABLE `lobs` ADD COLUMN `min_premium` real DEFAULT 0 NOT NULL;
ALTER TABLE `lobs` ADD COLUMN `wording_refs` text;

-- Add missing columns to insurers table
ALTER TABLE `insurers` ADD COLUMN `insurer_code` text;
ALTER TABLE `insurers` ADD COLUMN `license_expiry` text NOT NULL DEFAULT '2099-12-31';
ALTER TABLE `insurers` ADD COLUMN `special_lobs` text;
ALTER TABLE `insurers` ADD COLUMN `created_by` integer REFERENCES `users`(`id`);
ALTER TABLE `insurers` ADD COLUMN `updated_by` integer REFERENCES `users`(`id`);

-- Create unique index for insurer_code
CREATE UNIQUE INDEX IF NOT EXISTS `insurers_insurer_code_unique` ON `insurers` (`insurer_code`);

-- Create agents table if not exists
CREATE TABLE IF NOT EXISTS `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_code` text,
	`type` text NOT NULL,
	`legal_name` text,
	`full_name` text,
	`cac_rc` text,
	`tin` text,
	`email` text,
	`phone` text,
	`default_commission_pct` real DEFAULT 0 NOT NULL,
	`commission_model` text DEFAULT 'flat' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `agents_agent_code_unique` ON `agents` (`agent_code`);

-- Create agent_contacts table if not exists
CREATE TABLE IF NOT EXISTS `agent_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer,
	`full_name` text NOT NULL,
	`designation` text,
	`email` text,
	`phone` text,
	`is_primary` integer DEFAULT false,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `unique_agent_email` ON `agent_contacts` (`agent_id`,`email`);
CREATE INDEX IF NOT EXISTS `unique_agent_phone` ON `agent_contacts` (`agent_id`,`phone`);

-- Create agent_kyc_files table if not exists
CREATE TABLE IF NOT EXISTS `agent_kyc_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_id` integer,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer,
	`sha256_hash` text NOT NULL,
	`uploaded_by` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Create bank_accounts table if not exists
CREATE TABLE IF NOT EXISTS `bank_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bank_code` text,
	`owner_type` text NOT NULL,
	`owner_id` integer NOT NULL,
	`bank_name` text NOT NULL,
	`branch` text,
	`account_number` text NOT NULL,
	`account_country` text DEFAULT 'NG' NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`swift_bic` text,
	`usage_receivable` integer DEFAULT false,
	`usage_payable` integer DEFAULT false,
	`is_default` integer DEFAULT false,
	`statement_source` text DEFAULT 'Manual' NOT NULL,
	`gl_code` text,
	`active` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `bank_accounts_bank_code_unique` ON `bank_accounts` (`bank_code`);
CREATE INDEX IF NOT EXISTS `owner_type_id_idx` ON `bank_accounts` (`owner_type`,`owner_id`);
CREATE INDEX IF NOT EXISTS `unique_account_owner_idx` ON `bank_accounts` (`owner_type`,`owner_id`,`account_number`,`account_country`);

-- Create entity_sequences table if not exists
CREATE TABLE IF NOT EXISTS `entity_sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`year` integer NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `unique_entity_year` ON `entity_sequences` (`entity`,`year`);

-- Create endorsement_sequences table if not exists
CREATE TABLE IF NOT EXISTS `endorsement_sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`year` integer NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE INDEX IF NOT EXISTS `unique_endorsement_entity_year` ON `endorsement_sequences` (`entity`,`year`);

-- Create endorsements table if not exists
CREATE TABLE IF NOT EXISTS `endorsements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policy_id` integer,
	`endorsement_number` text NOT NULL,
	`type` text NOT NULL,
	`effective_date` text NOT NULL,
	`description` text,
	`sum_insured_delta` real DEFAULT 0,
	`gross_premium_delta` real DEFAULT 0,
	`brokerage_pct` real,
	`vat_pct` real,
	`levies` text,
	`net_amount_due` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`prepared_by` integer,
	`authorized_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prepared_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`authorized_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `endorsements_endorsement_number_unique` ON `endorsements` (`endorsement_number`);

-- Add missing columns to sub_lobs table
ALTER TABLE `sub_lobs` ADD COLUMN `override_brokerage_pct` real;
ALTER TABLE `sub_lobs` ADD COLUMN `override_vat_pct` real;
ALTER TABLE `sub_lobs` ADD COLUMN `override_min_premium` real;
ALTER TABLE `sub_lobs` ADD COLUMN `override_rate_basis` text;
ALTER TABLE `sub_lobs` ADD COLUMN `override_rating_inputs` text;
ALTER TABLE `sub_lobs` ADD COLUMN `wording_refs` text;

-- Add missing columns to clients table
ALTER TABLE `clients` ADD COLUMN `client_type` text DEFAULT 'Company' NOT NULL;