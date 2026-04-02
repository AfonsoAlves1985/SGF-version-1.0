-- Add spaceId column to maintenance_requests table
ALTER TABLE "maintenance_requests" ADD COLUMN "spaceId" integer DEFAULT 1 NOT NULL;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_spaceId_maintenance_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."maintenance_spaces"("id") ON DELETE cascade ON UPDATE no action;
