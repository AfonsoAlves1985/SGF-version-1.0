CREATE TABLE `suppliers_with_space` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`serviceTypes` json NOT NULL,
	`contact` varchar(255) NOT NULL,
	`contactPerson` varchar(255) NOT NULL,
	`status` enum('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_with_space_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `suppliers_with_space` ADD CONSTRAINT `suppliers_with_space_spaceId_consumable_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `consumable_spaces`(`id`) ON DELETE no action ON UPDATE no action;