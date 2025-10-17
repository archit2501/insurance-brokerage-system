CREATE TABLE `agents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
