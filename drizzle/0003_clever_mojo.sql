DROP INDEX "owner_type_id_idx";--> statement-breakpoint
DROP INDEX "unique_account_owner_idx";--> statement-breakpoint
DROP INDEX "clients_cac_rc_number_unique";--> statement-breakpoint
DROP INDEX "clients_tin_unique";--> statement-breakpoint
DROP INDEX "unique_client_email";--> statement-breakpoint
DROP INDEX "unique_client_phone";--> statement-breakpoint
DROP INDEX "unique_insurer_role_email";--> statement-breakpoint
DROP INDEX "insurers_license_number_unique";--> statement-breakpoint
DROP INDEX "lobs_name_unique";--> statement-breakpoint
DROP INDEX "lobs_code_unique";--> statement-breakpoint
DROP INDEX "unique_type_year";--> statement-breakpoint
DROP INDEX "notes_note_id_unique";--> statement-breakpoint
DROP INDEX "unique_note_type_year_seq";--> statement-breakpoint
DROP INDEX "policies_policy_number_unique";--> statement-breakpoint
DROP INDEX "unique_lob_sub_lob";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "approval_level" TO "approval_level" text;--> statement-breakpoint
CREATE INDEX `owner_type_id_idx` ON `bank_accounts` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE INDEX `unique_account_owner_idx` ON `bank_accounts` (`owner_type`,`owner_id`,`account_number`,`account_country`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_cac_rc_number_unique` ON `clients` (`cac_rc_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_tin_unique` ON `clients` (`tin`);--> statement-breakpoint
CREATE INDEX `unique_client_email` ON `contacts` (`client_id`,`email`);--> statement-breakpoint
CREATE INDEX `unique_client_phone` ON `contacts` (`client_id`,`phone`);--> statement-breakpoint
CREATE INDEX `unique_insurer_role_email` ON `insurer_emails` (`insurer_id`,`role`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `insurers_license_number_unique` ON `insurers` (`license_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `lobs_name_unique` ON `lobs` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `lobs_code_unique` ON `lobs` (`code`);--> statement-breakpoint
CREATE INDEX `unique_type_year` ON `note_sequences` (`note_type`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `notes_note_id_unique` ON `notes` (`note_id`);--> statement-breakpoint
CREATE INDEX `unique_note_type_year_seq` ON `notes` (`note_type`,`note_year`,`note_seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `policies_policy_number_unique` ON `policies` (`policy_number`);--> statement-breakpoint
CREATE INDEX `unique_lob_sub_lob` ON `sub_lobs` (`lob_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "status" TO "status" text NOT NULL DEFAULT 'Active';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `users` ADD `tfa_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `max_override_limit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` text;