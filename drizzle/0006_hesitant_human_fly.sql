CREATE TABLE `client_sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`type` text,
	`last_seq` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unique_year_type` ON `client_sequences` (`year`,`type`);