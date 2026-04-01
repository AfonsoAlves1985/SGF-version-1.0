CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` enum('create','read','update','delete','login','logout') NOT NULL,
	`module` varchar(100) NOT NULL,
	`recordId` int,
	`recordName` varchar(255),
	`changes` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('superadmin','admin','editor','viewer','user') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastLogin` timestamp;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_log_userId` ON `audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_log_module` ON `audit_log` (`module`);--> statement-breakpoint
CREATE INDEX `audit_log_createdAt` ON `audit_log` (`createdAt`);