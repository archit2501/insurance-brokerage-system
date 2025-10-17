CREATE TABLE `bank_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE INDEX `owner_type_id_idx` ON `bank_accounts` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE INDEX `unique_account_owner_idx` ON `bank_accounts` (`owner_type`,`owner_id`,`account_number`,`account_country`);