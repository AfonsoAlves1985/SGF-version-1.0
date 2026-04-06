CREATE TABLE IF NOT EXISTS "inventory_spaces" (
 "id" serial PRIMARY KEY NOT NULL,
 "name" varchar(255) NOT NULL,
 "description" text,
 "location" varchar(255),
 "createdAt" timestamp DEFAULT now() NOT NULL,
 "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_assets" (
 "id" serial PRIMARY KEY NOT NULL,
 "spaceId" integer NOT NULL,
 "filial" varchar(255) NOT NULL,
 "nrBem" varchar(120) NOT NULL,
 "descricao" text NOT NULL,
 "marca" varchar(120),
 "modelo" varchar(120),
 "conta" varchar(120) NOT NULL,
 "centroCusto" varchar(120) NOT NULL,
 "local" varchar(255),
 "fornecedor" varchar(255),
 "dtAquis" varchar(10) NOT NULL,
 "anoAquis" integer,
 "vlrCusto" numeric(12, 2) NOT NULL,
 "createdAt" timestamp DEFAULT now() NOT NULL,
 "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_assets" ADD CONSTRAINT "inventory_assets_spaceId_inventory_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."inventory_spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_assets_space_idx" ON "inventory_assets" USING btree ("spaceId");
