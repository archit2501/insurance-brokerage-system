CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` integer NOT NULL,
	`action` text NOT NULL,
	`old_values` text,
	`new_values` text,
	`user_id` integer,
	`ip_address` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`cac_rc_number` text NOT NULL,
	`tin` text NOT NULL,
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
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_cac_rc_number_unique` ON `clients` (`cac_rc_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `clients_tin_unique` ON `clients` (`tin`);--> statement-breakpoint
CREATE TABLE `cn_insurer_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer,
	`insurer_id` integer,
	`percentage` real NOT NULL,
	`amount` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`full_name` text NOT NULL,
	`designation` text,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`is_primary` integer DEFAULT false,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unique_client_email` ON `contacts` (`client_id`,`email`);--> statement-breakpoint
CREATE INDEX `unique_client_phone` ON `contacts` (`client_id`,`phone`);--> statement-breakpoint
CREATE TABLE `dispatch_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer,
	`recipient_emails` text,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`provider_message_id` text,
	`sent_by` integer,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sent_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `insurer_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`insurer_id` integer,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true,
	`created_at` text NOT NULL,
	FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unique_insurer_role_email` ON `insurer_emails` (`insurer_id`,`role`,`email`);--> statement-breakpoint
CREATE TABLE `insurers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text NOT NULL,
	`short_name` text NOT NULL,
	`license_number` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'Nigeria',
	`website` text,
	`accepted_lobs` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `insurers_license_number_unique` ON `insurers` (`license_number`);--> statement-breakpoint
CREATE TABLE `kyc_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer,
	`sha256_hash` text NOT NULL,
	`uploaded_by` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lobs_name_unique` ON `lobs` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `lobs_code_unique` ON `lobs` (`code`);--> statement-breakpoint
CREATE TABLE `note_sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_type` text NOT NULL,
	`year` integer NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unique_type_year` ON `note_sequences` (`note_type`,`year`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` text NOT NULL,
	`note_type` text NOT NULL,
	`note_seq` integer NOT NULL,
	`note_year` integer NOT NULL,
	`client_id` integer,
	`insurer_id` integer,
	`policy_id` integer,
	`gross_premium` real NOT NULL,
	`brokerage_pct` real NOT NULL,
	`brokerage_amount` real NOT NULL,
	`vat_pct` real DEFAULT 7.5 NOT NULL,
	`vat_on_brokerage` real NOT NULL,
	`agent_commission_pct` real DEFAULT 0,
	`agent_commission` real DEFAULT 0,
	`net_brokerage` real NOT NULL,
	`levies` text,
	`net_amount_due` real NOT NULL,
	`payable_bank_account_id` integer,
	`co_insurance` text,
	`status` text DEFAULT 'Draft' NOT NULL,
	`pdf_path` text,
	`sha256_hash` text,
	`prepared_by` integer,
	`authorized_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prepared_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`authorized_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_note_id_unique` ON `notes` (`note_id`);--> statement-breakpoint
CREATE INDEX `unique_note_type_year_seq` ON `notes` (`note_type`,`note_year`,`note_seq`);--> statement-breakpoint
CREATE TABLE `policies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policy_number` text NOT NULL,
	`client_id` integer,
	`insurer_id` integer,
	`rfq_id` integer,
	`lob_id` integer,
	`sub_lob_id` integer,
	`sum_insured` real NOT NULL,
	`gross_premium` real NOT NULL,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`policy_start_date` text NOT NULL,
	`policy_end_date` text NOT NULL,
	`confirmation_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rfq_id`) REFERENCES `rfqs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lob_id`) REFERENCES `lobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_lob_id`) REFERENCES `sub_lobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policies_policy_number_unique` ON `policies` (`policy_number`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note_id` integer,
	`type` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rfq_insurers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rfq_id` integer,
	`insurer_id` integer,
	`offered_rate_pct` real,
	`offered_gross_premium` real,
	`notes` text,
	`is_selected` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`rfq_id`) REFERENCES `rfqs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`primary_lob_id` integer,
	`sub_lob_id` integer,
	`description` text NOT NULL,
	`expected_sum_insured` real,
	`expected_gross_premium` real,
	`currency` text DEFAULT 'NGN' NOT NULL,
	`target_rate_pct` real,
	`status` text DEFAULT 'Draft' NOT NULL,
	`selected_insurer_id` integer,
	`created_by` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_lob_id`) REFERENCES `lobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sub_lob_id`) REFERENCES `sub_lobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`selected_insurer_id`) REFERENCES `insurers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sub_lobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lob_id` integer,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lob_id`) REFERENCES `lobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unique_lob_sub_lob` ON `sub_lobs` (`lob_id`,`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`approval_level` integer DEFAULT 0,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);