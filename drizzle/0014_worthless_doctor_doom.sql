ALTER TABLE `rooms` ADD `responsibleUserName` varchar(255);--> statement-breakpoint
ALTER TABLE `rooms` ADD `isReleased` int DEFAULT 0 NOT NULL;