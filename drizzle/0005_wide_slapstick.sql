CREATE TABLE `sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`year` integer NOT NULL,
	`last_seq` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `unique_entity_year` ON `sequences` (`entity`,`year`);--> statement-breakpoint
ALTER TABLE `clients` ADD `client_code` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `clients_client_code_unique` ON `clients` (`client_code`);