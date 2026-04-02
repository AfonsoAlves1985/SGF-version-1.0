ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "cnpj" varchar(18);
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contact" varchar(255);
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "isRenewable" boolean DEFAULT false NOT NULL;
