CREATE TABLE `consumable_stock_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consumableWeeklyMovementId` int NOT NULL,
	`consumableId` int NOT NULL,
	`spaceId` int NOT NULL,
	`weekStartDate` date NOT NULL,
	`userId` int NOT NULL,
	`previousValue` int NOT NULL,
	`newValue` int NOT NULL,
	`fieldName` varchar(50) NOT NULL,
	`changeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consumable_stock_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consumable_stock_audit_log` ADD CONSTRAINT `consumable_stock_audit_log_consumableWeeklyMovementId_consumable_weekly_movements_id_fk` FOREIGN KEY (`consumableWeeklyMovementId`) REFERENCES `consumable_weekly_movements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_stock_audit_log` ADD CONSTRAINT `consumable_stock_audit_log_consumableId_consumables_with_space_id_fk` FOREIGN KEY (`consumableId`) REFERENCES `consumables_with_space`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_stock_audit_log` ADD CONSTRAINT `consumable_stock_audit_log_spaceId_consumable_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_stock_audit_log` ADD CONSTRAINT `consumable_stock_audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;