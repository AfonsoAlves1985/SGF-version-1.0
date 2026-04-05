ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "department" varchar(120);
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "requestDate" varchar(10);
