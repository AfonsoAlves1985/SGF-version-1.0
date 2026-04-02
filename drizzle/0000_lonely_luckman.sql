CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."contract_alert_type" AS ENUM('monthly_payment', 'contract_expiry');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('ativo', 'inativo', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('mensal', 'anual');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('ativo', 'inativo', 'descontinuado');--> statement-breakpoint
CREATE TYPE "public"."maintenance_priority" AS ENUM('baixa', 'media', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('aberto', 'em_progresso', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('preventiva', 'correctiva');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."room_reservation_status" AS ENUM('confirmada', 'pendente', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('disponivel', 'ocupada', 'manutencao');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('sala', 'auditorio', 'cozinha', 'outro');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('confirmada', 'pendente', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."shift" AS ENUM('manha', 'tarde', 'noite');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('ESTOQUE_OK', 'ACIMA_DO_ESTOQUE', 'REPOR_ESTOQUE');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('ativo', 'inativo', 'suspenso');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('limpeza', 'manutencao', 'admin');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('superadmin', 'admin', 'editor', 'viewer', 'user');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"action" "audit_action" NOT NULL,
	"module" varchar(100) NOT NULL,
	"recordId" integer,
	"recordName" varchar(255),
	"changes" json,
	"ipAddress" varchar(45),
	"userAgent" text,
	"status" "audit_status" DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumable_monthly_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumableId" integer NOT NULL,
	"spaceId" integer NOT NULL,
	"monthStartDate" varchar(10) NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"week1Stock" integer DEFAULT 0 NOT NULL,
	"week2Stock" integer DEFAULT 0 NOT NULL,
	"week3Stock" integer DEFAULT 0 NOT NULL,
	"week4Stock" integer DEFAULT 0 NOT NULL,
	"week5Stock" integer DEFAULT 0 NOT NULL,
	"totalMovement" integer DEFAULT 0 NOT NULL,
	"averageStock" integer DEFAULT 0 NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumable_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumable_stock_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumableWeeklyMovementId" integer NOT NULL,
	"consumableId" integer NOT NULL,
	"spaceId" integer NOT NULL,
	"weekStartDate" varchar(10) NOT NULL,
	"userId" integer NOT NULL,
	"previousValue" integer NOT NULL,
	"newValue" integer NOT NULL,
	"fieldName" varchar(50) NOT NULL,
	"changeReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumable_weekly_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumableId" integer NOT NULL,
	"spaceId" integer NOT NULL,
	"weekStartDate" varchar(10) NOT NULL,
	"weekNumber" integer NOT NULL,
	"year" integer NOT NULL,
	"mondayStock" integer DEFAULT 0 NOT NULL,
	"tuesdayStock" integer DEFAULT 0 NOT NULL,
	"wednesdayStock" integer DEFAULT 0 NOT NULL,
	"thursdayStock" integer DEFAULT 0 NOT NULL,
	"fridayStock" integer DEFAULT 0 NOT NULL,
	"saturdayStock" integer DEFAULT 0 NOT NULL,
	"sundayStock" integer DEFAULT 0 NOT NULL,
	"totalMovement" integer DEFAULT 0 NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumables" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"maxStock" integer DEFAULT 0 NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"replenishStock" integer DEFAULT 0 NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumables_monthly" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumableId" integer,
	"monthStartDate" varchar(25) NOT NULL,
	"minStock" integer NOT NULL,
	"maxStock" integer NOT NULL,
	"currentStock" integer NOT NULL,
	"replenishStock" integer NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumables_weekly" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumableId" integer,
	"weekStartDate" varchar(25) NOT NULL,
	"minStock" integer NOT NULL,
	"maxStock" integer NOT NULL,
	"currentStock" integer NOT NULL,
	"replenishStock" integer NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumables_with_space" (
	"id" serial PRIMARY KEY NOT NULL,
	"spaceId" integer,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"minStock" integer DEFAULT 0 NOT NULL,
	"maxStock" integer DEFAULT 0 NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"replenishStock" integer DEFAULT 0 NOT NULL,
	"status" "stock_status" DEFAULT 'ESTOQUE_OK' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contractId" integer,
	"spaceId" integer,
	"alertType" "contract_alert_type" NOT NULL,
	"daysUntilEvent" integer NOT NULL,
	"isResolved" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "contract_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"contractType" "contract_type" NOT NULL,
	"signatureDate" varchar(10) NOT NULL,
	"endDate" varchar(25) NOT NULL,
	"monthlyPaymentDate" integer,
	"documentUrl" text,
	"value" numeric(10, 2),
	"status" "contract_status" DEFAULT 'ativo' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "contracts_with_space" (
	"id" serial PRIMARY KEY NOT NULL,
	"spaceId" integer,
	"contractId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"minQuantity" integer DEFAULT 5 NOT NULL,
	"unit" varchar(50) DEFAULT 'unidade' NOT NULL,
	"location" varchar(255) NOT NULL,
	"status" "inventory_status" DEFAULT 'ativo' NOT NULL,
	"lastUpdated" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"inventoryId" integer,
	"type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" varchar(255),
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "maintenance_priority" DEFAULT 'media' NOT NULL,
	"type" "maintenance_type" NOT NULL,
	"status" "maintenance_status" DEFAULT 'aberto' NOT NULL,
	"assignedTo" integer,
	"createdBy" integer,
	"completedAt" varchar(25),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"spaceId" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomId" integer,
	"userId" integer,
	"startTime" varchar(25) NOT NULL,
	"endTime" varchar(25) NOT NULL,
	"purpose" varchar(255),
	"status" "room_reservation_status" DEFAULT 'confirmada' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"capacity" integer NOT NULL,
	"location" varchar(255) NOT NULL,
	"type" "room_type" NOT NULL,
	"status" "room_status" DEFAULT 'disponivel' NOT NULL,
	"responsibleUserName" varchar(255),
	"startDate" varchar(10),
	"endDate" varchar(10),
	"startTime" varchar(5),
	"endTime" varchar(5),
	"isReleased" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"teamId" integer,
	"date" varchar(25) NOT NULL,
	"shift" "shift" NOT NULL,
	"sector" varchar(100),
	"status" "schedule_status" DEFAULT 'confirmada' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "supplier_status" DEFAULT 'ativo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"serviceTypes" json NOT NULL,
	"contact" varchar(255) NOT NULL,
	"contactPerson" varchar(255) NOT NULL,
	"notes" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers_with_space" (
	"id" serial PRIMARY KEY NOT NULL,
	"spaceId" integer,
	"companyName" varchar(255) NOT NULL,
	"serviceTypes" json NOT NULL,
	"contact" varchar(255) NOT NULL,
	"contactPerson" varchar(255) NOT NULL,
	"status" "supplier_status" DEFAULT 'ativo' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"role" "team_role" NOT NULL,
	"sector" varchar(100),
	"status" "team_status" DEFAULT 'ativo' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"password" varchar(255),
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastLogin" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumables_monthly" ADD CONSTRAINT "consumables_monthly_consumableId_consumables_id_fk" FOREIGN KEY ("consumableId") REFERENCES "public"."consumables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumables_weekly" ADD CONSTRAINT "consumables_weekly_consumableId_consumables_id_fk" FOREIGN KEY ("consumableId") REFERENCES "public"."consumables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumables_with_space" ADD CONSTRAINT "consumables_with_space_spaceId_consumable_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."consumable_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_alerts" ADD CONSTRAINT "contract_alerts_contractId_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_alerts" ADD CONSTRAINT "contract_alerts_spaceId_consumable_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."consumable_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts_with_space" ADD CONSTRAINT "contracts_with_space_spaceId_contract_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."contract_spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts_with_space" ADD CONSTRAINT "contracts_with_space_contractId_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryId_inventory_id_fk" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assignedTo_teams_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_spaceId_maintenance_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."maintenance_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_reservations" ADD CONSTRAINT "room_reservations_roomId_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_reservations" ADD CONSTRAINT "room_reservations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers_with_space" ADD CONSTRAINT "suppliers_with_space_spaceId_supplier_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."supplier_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_userId" ON "audit_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "audit_log_module" ON "audit_log" USING btree ("module");--> statement-breakpoint
CREATE INDEX "audit_log_createdAt" ON "audit_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "fk_1" ON "contracts_with_space" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "suppliers_with_space_spaceId_consumable_spaces_id_fk" ON "suppliers_with_space" USING btree ("spaceId");--> statement-breakpoint
CREATE INDEX "users_openId_unique" ON "users" USING btree ("openId");