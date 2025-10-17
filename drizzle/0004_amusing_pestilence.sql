CREATE TABLE `agent_contacts` (
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
--> statement-breakpoint
CREATE INDEX `unique_agent_email` ON `agent_contacts` (`agent_id`,`email`);--> statement-breakpoint
CREATE INDEX `unique_agent_phone` ON `agent_contacts` (`agent_id`,`phone`);--> statement-breakpoint
CREATE TABLE `agent_kyc_files` (
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
