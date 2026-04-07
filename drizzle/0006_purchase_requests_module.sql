DO $$ BEGIN
 CREATE TYPE "public"."purchase_request_urgency" AS ENUM('baixa', 'normal', 'alta');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."purchase_request_status" AS ENUM('rascunho', 'solicitado', 'cotacao', 'financeiro', 'aprovado', 'pedido_emitido', 'recebido', 'cancelado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requests" (
 "id" serial PRIMARY KEY NOT NULL,
 "documentNumber" varchar(30) NOT NULL,
 "requestDate" varchar(10) NOT NULL,
 "neededDate" varchar(10) NOT NULL,
 "urgency" "purchase_request_urgency" DEFAULT 'normal' NOT NULL,
 "company" varchar(255) NOT NULL,
 "costCenter" varchar(150) NOT NULL,
 "purchaseType" varchar(150) NOT NULL,
 "requesterName" varchar(255) NOT NULL,
 "requesterRegistration" varchar(80),
 "requesterRole" varchar(120),
 "requesterEmail" varchar(320) NOT NULL,
 "requesterPhone" varchar(40),
 "supplierName" varchar(255),
 "supplierDocument" varchar(30),
 "supplierContact" varchar(255),
 "supplierDeliveryEstimate" varchar(120),
 "justification" text NOT NULL,
 "observations" text,
 "attachments" json,
 "itemsCount" integer DEFAULT 0 NOT NULL,
 "totalAmount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
 "status" "purchase_request_status" DEFAULT 'solicitado' NOT NULL,
 "financeApproved" boolean DEFAULT false NOT NULL,
 "billingCnpj" varchar(18),
 "paymentTerms" varchar(255),
 "createdBy" integer,
 "createdAt" timestamp DEFAULT now() NOT NULL,
 "updatedAt" timestamp DEFAULT now() NOT NULL,
 "completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_request_items" (
 "id" serial PRIMARY KEY NOT NULL,
 "purchaseRequestId" integer NOT NULL,
 "itemOrder" integer DEFAULT 1 NOT NULL,
 "description" text NOT NULL,
 "unit" varchar(40) NOT NULL,
 "quantity" double precision NOT NULL,
 "unitPrice" numeric(14, 2) NOT NULL,
 "totalPrice" numeric(14, 2) NOT NULL,
 "supplierSuggestion" varchar(255),
 "createdAt" timestamp DEFAULT now() NOT NULL,
 "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchaseRequestId_purchase_requests_id_fk" FOREIGN KEY ("purchaseRequestId") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_document_idx" ON "purchase_requests" USING btree ("documentNumber");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx" ON "purchase_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requests_createdAt_idx" ON "purchase_requests" USING btree ("createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_request_items_request_idx" ON "purchase_request_items" USING btree ("purchaseRequestId");
