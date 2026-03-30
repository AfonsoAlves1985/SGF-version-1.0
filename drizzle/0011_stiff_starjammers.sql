ALTER TABLE `contracts_with_space` DROP FOREIGN KEY `contracts_with_space_spaceId_consumable_spaces_id_fk`;
--> statement-breakpoint
ALTER TABLE `maintenance_requests` DROP FOREIGN KEY `maintenance_requests_spaceId_maintenance_spaces_id_fk`;
--> statement-breakpoint
ALTER TABLE `suppliers_with_space` DROP FOREIGN KEY `suppliers_with_space_spaceId_consumable_spaces_id_fk`;
--> statement-breakpoint
ALTER TABLE `maintenance_spaces` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `maintenance_requests` MODIFY COLUMN `spaceId` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_spaceId_maintenance_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `maintenance_spaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers_with_space` ADD CONSTRAINT `suppliers_with_space_spaceId_supplier_spaces_id_fk` FOREIGN KEY (`spaceId`) REFERENCES `supplier_spaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fk_1` ON `contracts_with_space` (`spaceId`);--> statement-breakpoint
CREATE INDEX `suppliers_with_space_spaceId_consumable_spaces_id_fk` ON `suppliers_with_space` (`spaceId`);