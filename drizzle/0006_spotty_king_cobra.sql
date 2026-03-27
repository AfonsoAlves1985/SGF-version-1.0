ALTER TABLE `suppliers` MODIFY COLUMN `status` enum('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `companyName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `serviceTypes` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contact` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contactPerson` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `suppliers` DROP COLUMN `category`;