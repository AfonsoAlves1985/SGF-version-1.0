DO $$ BEGIN
  CREATE TYPE "corporate_line_plan_type" AS ENUM ('pos_pago', 'pre_pago');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "corporate_lines" (
  "id" serial PRIMARY KEY,
  "planType" "corporate_line_plan_type" NOT NULL,
  "department" varchar(120) NOT NULL,
  "company" varchar(160) NOT NULL,
  "responsibleName" varchar(160) NOT NULL,
  "phoneNumber" varchar(20) NOT NULL,
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "corporate_lines_planType_idx"
ON "corporate_lines" ("planType");

CREATE INDEX IF NOT EXISTS "corporate_lines_department_idx"
ON "corporate_lines" ("department");

CREATE INDEX IF NOT EXISTS "corporate_lines_company_idx"
ON "corporate_lines" ("company");
