CREATE TABLE `consumable_monthly_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consumableId` int NOT NULL,
	`spaceId` int NOT NULL,
	`monthStartDate` date NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`week1Stock` int NOT NULL DEFAULT 0,
	`week2Stock` int NOT NULL DEFAULT 0,
	`week3Stock` int NOT NULL DEFAULT 0,
	`week4Stock` int NOT NULL DEFAULT 0,
	`week5Stock` int NOT NULL DEFAULT 0,
	`totalMovement` int NOT NULL DEFAULT 0,
	`averageStock` int NOT NULL DEFAULT 0,
	`status` enum('ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE') NOT NULL DEFAULT 'ESTOQUE_OK',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consumable_monthly_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consumable_weekly_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consumableId` int NOT NULL,
	`spaceId` int NOT NULL,
	`weekStartDate` date NOT NULL,
	`weekNumber` int NOT NULL,
	`year` int NOT NULL,
	`mondayStock` int NOT NULL DEFAULT 0,
	`tuesdayStock` int NOT NULL DEFAULT 0,
	`wednesdayStock` int NOT NULL DEFAULT 0,
	`thursdayStock` int NOT NULL DEFAULT 0,
	`fridayStock` int NOT NULL DEFAULT 0,
	`saturdayStock` int NOT NULL DEFAULT 0,
	`sundayStock` int NOT NULL DEFAULT 0,
	`totalMovement` int NOT NULL DEFAULT 0,
	`status` enum('ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE') NOT NULL DEFAULT 'ESTOQUE_OK',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consumable_weekly_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consumable_monthly_movements` ADD CONSTRAINT `consumable_monthly_movements_consumableId_consumables_with_space_id_fk` FOREIGN KEY (`consumableId`) REFERENCES `consumables_with_space`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_monthly_movements` ADD CONSTRAINT `consumable_monthly_movements_spaceId_consumable_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_weekly_movements` ADD CONSTRAINT `consumable_weekly_movements_consumableId_consumables_with_space_id_fk` FOREIGN KEY (`consumableId`) REFERENCES `consumables_with_space`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consumable_weekly_movements` ADD CONSTRAINT `consumable_weekly_movements_spaceId_consumable_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`) ON DELETE no action ON UPDATE no action;