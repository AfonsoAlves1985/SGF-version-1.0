import { eq, and, or, desc, asc, gte, lte, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import fs from "node:fs";
import path from "node:path";
import {
  InsertUser,
  users,
  userInvitations,
  InsertUserInvitation,
  inventory,
  inventoryMovements,
  InsertInventory,
  inventorySpaces,
  inventoryAssets,
  InsertInventorySpace,
  InsertInventoryAsset,
  InsertInventoryMovement,
  teams,
  InsertTeam,
  rooms,
  roomReservations,
  InsertRoom,
  InsertRoomReservation,
  maintenanceRequests,
  InsertMaintenanceRequest,
  maintenanceSpaces,
  suppliers,
  InsertSupplier,
  suppliersWithSpace,
  InsertSupplierWithSpace,
  supplierSpaces,
  InsertSupplierSpace,
  consumables,
  consumablesWeekly,
  consumablesMonthly,
  InsertConsumable,
  InsertConsumableWeekly,
  InsertConsumableMonthly,
  consumableSpaces,
  consumablesWithSpace,
  InsertConsumableSpace,
  InsertConsumableWithSpace,
  consumableWeeklyMovements,
  consumableMonthlyMovements,
  InsertConsumableWeeklyMovement,
  InsertConsumableMonthlyMovement,
  consumableStockAuditLog,
  InsertConsumableStockAuditLog,
  contracts,
  contractsWithSpace,
  contractAlerts,
  contractSpaces,
  InsertContract,
  InsertContractWithSpace,
  InsertContractAlert,
  InsertContractSpace,
  auditLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let usersAuthSchemaEnsured = false;
let coreSchemaBootstrapAttempted = false;
let essentialTablesEnsured = false;

const MIGRATION_FILES = [
  "0000_lonely_luckman.sql",
  "0001_add_spaceid.sql",
  "0002_contract_fields.sql",
  "0003_maintenance_request_fields.sql",
  "0004_user_invitations.sql",
  "0005_inventory_units_assets.sql",
] as const;

const NON_FATAL_MIGRATION_ERROR_CODES = new Set([
  "42710", // duplicate_object (type already exists)
  "42P07", // duplicate_table / duplicate_index
  "42701", // duplicate_column
  "23505", // unique_violation (duplicate index names in some cases)
]);

async function bootstrapCoreSchemaFromMigrations(
  db: ReturnType<typeof drizzle>
) {
  const migrationDir = path.resolve(process.cwd(), "drizzle");

  for (const filename of MIGRATION_FILES) {
    const filePath = path.join(migrationDir, filename);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const rawSql = fs.readFileSync(filePath, "utf-8");
    const statements = rawSql
      .split("--> statement-breakpoint")
      .map(stmt => stmt.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (error: any) {
        const errorCode = error?.code as string | undefined;
        if (errorCode && NON_FATAL_MIGRATION_ERROR_CODES.has(errorCode)) {
          continue;
        }

        console.warn(
          `[Database] Migration statement failed (${filename}). Continuing bootstrap.`,
          {
            code: errorCode,
            message: error?.message,
          }
        );
      }
    }
  }
}

async function ensureEssentialModuleTables(db: ReturnType<typeof drizzle>) {
  if (essentialTablesEnsured) return;

  const run = async (statement: string) => {
    try {
      await db.execute(sql.raw(statement));
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code && NON_FATAL_MIGRATION_ERROR_CODES.has(code)) return;
      console.warn("[Database] Essential table statement failed", {
        code,
        message: error?.message,
      });
    }
  };

  await run(`
    CREATE TABLE IF NOT EXISTS "teams" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "email" varchar(320),
      "phone" varchar(20),
      "role" varchar(32) NOT NULL DEFAULT 'admin',
      "sector" varchar(100),
      "status" varchar(32) NOT NULL DEFAULT 'ativo',
      "createdAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "rooms" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "capacity" integer NOT NULL,
      "location" varchar(255) NOT NULL,
      "type" varchar(32) NOT NULL DEFAULT 'sala',
      "status" varchar(32) NOT NULL DEFAULT 'disponivel',
      "responsibleUserName" varchar(255),
      "startDate" varchar(25),
      "endDate" varchar(25),
      "startTime" varchar(5),
      "endTime" varchar(5),
      "isReleased" integer DEFAULT 0,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "maintenance_spaces" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "location" varchar(255),
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "maintenance_requests" (
      "id" serial PRIMARY KEY,
      "title" varchar(255) NOT NULL,
      "description" text,
      "department" varchar(120),
      "requestDate" varchar(10),
      "priority" varchar(32) NOT NULL DEFAULT 'media',
      "type" varchar(32) NOT NULL DEFAULT 'preventiva',
      "status" varchar(32) NOT NULL DEFAULT 'aberto',
      "assignedTo" integer,
      "createdBy" integer,
      "completedAt" timestamp,
      "notes" text,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL,
      "spaceId" integer DEFAULT 1 NOT NULL
    );
  `);

  await run(
    `ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "department" varchar(120);`
  );
  await run(
    `ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "requestDate" varchar(10);`
  );

  await run(`
    CREATE TABLE IF NOT EXISTS "consumable_spaces" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "location" varchar(255),
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "consumables_with_space" (
      "id" serial PRIMARY KEY,
      "spaceId" integer,
      "name" varchar(255) NOT NULL,
      "category" varchar(100) NOT NULL,
      "unit" varchar(50) NOT NULL,
      "minStock" integer DEFAULT 0 NOT NULL,
      "maxStock" integer DEFAULT 0 NOT NULL,
      "currentStock" integer DEFAULT 0 NOT NULL,
      "replenishStock" integer DEFAULT 0 NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'ESTOQUE_OK',
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "contract_spaces" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "location" varchar(255),
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "contracts" (
      "id" serial PRIMARY KEY,
      "companyName" varchar(255) NOT NULL,
      "cnpj" varchar(18),
      "description" text NOT NULL,
      "contact" varchar(255),
      "contractType" varchar(32) NOT NULL DEFAULT 'mensal',
      "signatureDate" varchar(10) NOT NULL,
      "endDate" varchar(25) NOT NULL,
      "monthlyPaymentDate" integer,
      "isRenewable" boolean DEFAULT false NOT NULL,
      "documentUrl" text,
      "value" numeric(10,2),
      "status" varchar(32) NOT NULL DEFAULT 'ativo',
      "notes" text,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "contracts_with_space" (
      "id" serial PRIMARY KEY,
      "spaceId" integer,
      "contractId" integer,
      "createdAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "inventory" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "category" varchar(100) NOT NULL,
      "quantity" integer DEFAULT 0 NOT NULL,
      "minQuantity" integer DEFAULT 0 NOT NULL,
      "unit" varchar(50) NOT NULL,
      "location" varchar(255),
      "status" varchar(32) NOT NULL DEFAULT 'ativo',
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "inventory_spaces" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "location" varchar(255),
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "inventory_assets" (
      "id" serial PRIMARY KEY,
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
      "vlrCusto" numeric(12,2) NOT NULL,
      "createdAt" timestamp DEFAULT now() NOT NULL,
      "updatedAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS "inventory_assets_space_idx"
    ON "inventory_assets" ("spaceId");
  `);

  await run(`
    DO $$ BEGIN
      ALTER TABLE "inventory_assets"
      ADD CONSTRAINT "inventory_assets_spaceId_inventory_spaces_id_fk"
      FOREIGN KEY ("spaceId") REFERENCES "inventory_spaces"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "room_reservations" (
      "id" serial PRIMARY KEY,
      "roomId" integer,
      "userId" integer,
      "startTime" timestamp NOT NULL,
      "endTime" timestamp NOT NULL,
      "purpose" text,
      "status" varchar(32) NOT NULL DEFAULT 'confirmada',
      "createdAt" timestamp DEFAULT now() NOT NULL
    );
  `);

  essentialTablesEnsured = true;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }

  if (_db && !coreSchemaBootstrapAttempted) {
    coreSchemaBootstrapAttempted = true;
    await bootstrapCoreSchemaFromMigrations(_db);
    await ensureEssentialModuleTables(_db);
  }

  return _db;
}

async function ensureUsersAuthSchema() {
  if (usersAuthSchemaEnsured) return;

  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY,
        "openId" varchar(64),
        "name" text,
        "email" varchar(320),
        "loginMethod" varchar(64),
        "password" varchar(255),
        "role" varchar(32) DEFAULT 'viewer',
        "isActive" boolean DEFAULT true,
        "lastLogin" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        "lastSignedIn" timestamp DEFAULT now()
      );
    `);

    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "openId" varchar(64);`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(320);`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loginMethod" varchar(64);`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" varchar(255);`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(32) DEFAULT 'viewer';`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true;`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLogin" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();`
    );
    await db.execute(
      sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSignedIn" timestamp DEFAULT now();`
    );

    await db.execute(
      sql`UPDATE "users" SET "role" = 'viewer' WHERE "role" IS NULL;`
    );
    await db.execute(
      sql`UPDATE "users" SET "isActive" = true WHERE "isActive" IS NULL;`
    );
    await db.execute(
      sql`UPDATE "users" SET "lastSignedIn" = now() WHERE "lastSignedIn" IS NULL;`
    );
    await db.execute(
      sql`UPDATE "users" SET "createdAt" = now() WHERE "createdAt" IS NULL;`
    );
    await db.execute(
      sql`UPDATE "users" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;`
    );

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "users_openId_idx" ON "users" ("openId");`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");`
    );

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_invitations" (
        "id" serial PRIMARY KEY,
        "email" varchar(320) NOT NULL,
        "name" text,
        "role" varchar(32) DEFAULT 'viewer' NOT NULL,
        "token" varchar(255) NOT NULL,
        "status" varchar(32) DEFAULT 'pending' NOT NULL,
        "invitedByUserId" integer,
        "expiresAt" timestamp NOT NULL,
        "acceptedAt" timestamp,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "email" varchar(320);`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "name" text;`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "role" varchar(32) DEFAULT 'viewer';`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "token" varchar(255);`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'pending';`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "invitedByUserId" integer;`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "acceptedAt" timestamp;`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();`
    );
    await db.execute(
      sql`ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now();`
    );

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "user_invitations" ("email");`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "user_invitations_token_idx" ON "user_invitations" ("token");`
    );

    usersAuthSchemaEnsured = true;
  } catch (error) {
    console.warn(
      "[Database] Could not auto-adjust users auth schema. Continuing with existing schema.",
      error
    );
    usersAuthSchemaEnsured = true;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "superadmin";
      updateSet.role = "superadmin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ INVENTÁRIO ============

export async function listInventory(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category)
    conditions.push(eq(inventory.category, filters.category));
  if (filters?.status)
    conditions.push(eq(inventory.status, filters.status as any));
  if (filters?.search)
    conditions.push(like(inventory.name, `%${filters.search}%`));

  let query = db.select().from(inventory);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(inventory.createdAt))) as any;
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createInventory(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventory).values(data);
  return result;
}

export async function updateInventory(
  id: number,
  data: Partial<InsertInventory>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function deleteInventory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(inventory).where(eq(inventory.id, id));
}

export async function listInventorySpaces() {
  const db = await getDb();
  if (!db) return [];

  return (await db
    .select()
    .from(inventorySpaces)
    .orderBy(asc(inventorySpaces.name))) as any;
}

export async function createInventorySpace(data: InsertInventorySpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(inventorySpaces).values(data);
}

export async function updateInventorySpace(
  id: number,
  data: Partial<InsertInventorySpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertInventorySpace> = {
    ...data,
    updatedAt: new Date(),
  };

  return db
    .update(inventorySpaces)
    .set(updateData)
    .where(eq(inventorySpaces.id, id));
}

export async function deleteInventorySpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(inventoryAssets).where(eq(inventoryAssets.spaceId, id));
  return db.delete(inventorySpaces).where(eq(inventorySpaces.id, id));
}

export async function listInventoryAssets(filters?: {
  spaceId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.spaceId) {
    conditions.push(eq(inventoryAssets.spaceId, filters.spaceId));
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        like(inventoryAssets.nrBem, searchTerm),
        like(inventoryAssets.descricao, searchTerm),
        like(inventoryAssets.fornecedor, searchTerm),
        like(inventoryAssets.local, searchTerm)
      )
    );
  }

  let query = db.select().from(inventoryAssets);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return (await query.orderBy(desc(inventoryAssets.createdAt))) as any;
}

export async function createInventoryAsset(data: InsertInventoryAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(inventoryAssets).values(data);
}

export async function updateInventoryAsset(
  id: number,
  data: Partial<InsertInventoryAsset>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Partial<InsertInventoryAsset> = {
    ...data,
    updatedAt: new Date(),
  };

  return db.update(inventoryAssets).set(updateData).where(eq(inventoryAssets.id, id));
}

export async function deleteInventoryAsset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(inventoryAssets).where(eq(inventoryAssets.id, id));
}

export async function getInventoryMovements(inventoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.inventoryId, inventoryId))
    .orderBy(desc(inventoryMovements.createdAt));
}

export async function getAllInventoryMovements() {
  const db = await getDb();
  if (!db) return [];
  // @ts-ignore
  return await db
    .select()
    .from(inventoryMovements)
    .orderBy(desc(inventoryMovements.createdAt));
}

export async function addInventoryMovement(data: InsertInventoryMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(inventoryMovements).values(data);
}

// ============ EQUIPA ============

export async function listTeams(filters?: { role?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.role) conditions.push(eq(teams.role, filters.role as any));
  if (filters?.status) conditions.push(eq(teams.status, filters.status as any));

  let query = db.select().from(teams);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(teams.name))) as any;
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result[0] || null;
}

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(teams).values(data);
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(teams).set(data).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(teams).where(eq(teams.id, id));
}

// ============ SALAS ============

export async function listRooms(filters?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status && filters.status !== "all")
    conditions.push(eq(rooms.status, filters.status as any));

  let query = db.select().from(rooms);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(rooms.name))) as any;
}

export async function getRoomById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result[0] || null;
}

export async function createRoom(data: InsertRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Convert dates to DD-MM-YYYY format
  const processData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (v instanceof Date) {
        const day = String(v.getDate()).padStart(2, "0");
        const month = String(v.getMonth() + 1).padStart(2, "0");
        const year = v.getFullYear();
        return [k, `${day}-${month}-${year}`];
      }
      // Handle string date in format YYYY-MM-DD from browser date picker
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [year, month, day] = v.split("-");
        return [k, `${day}-${month}-${year}`];
      }
      return [k, v];
    })
  );

  return db.insert(rooms).values(processData as unknown as InsertRoom);
}

export async function updateRoom(id: number, data: Partial<InsertRoom>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Filter out undefined values and convert dates to DD-MM-YYYY format
  const processData = Object.fromEntries(
    Object.entries(data)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => {
        if (v instanceof Date) {
          const day = String(v.getDate()).padStart(2, "0");
          const month = String(v.getMonth() + 1).padStart(2, "0");
          const year = v.getFullYear();
          return [k, `${day}-${month}-${year}`];
        }
        // Handle string date in format YYYY-MM-DD from browser date picker
        if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const [year, month, day] = v.split("-");
          return [k, `${day}-${month}-${year}`];
        }
        return [k, v];
      })
  );

  const updateData = processData;

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    throw new Error("No values to set");
  }

  return db
    .update(rooms)
    .set(updateData as any)
    .where(eq(rooms.id, id));
}

export async function deleteRoom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(rooms).where(eq(rooms.id, id));
}

export async function getRoomUsageStats(roomId: number) {
  const db = await getDb();
  if (!db) return null;

  const room = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room[0]) return null;

  const roomData = room[0] as any;
  const startDate = new Date(roomData.startDate);
  const endDate = new Date(roomData.endDate);
  const now = new Date();

  // Calcular tempo decorrido
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsedTime = Math.min(
    now.getTime() - startDate.getTime(),
    totalDuration
  );
  const remainingTime = Math.max(endDate.getTime() - now.getTime(), 0);

  // Calcular percentual de uso
  const usagePercentage =
    totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;

  // Determinar status de alerta
  let alertStatus = "normal";
  if (remainingTime <= 0) {
    alertStatus = "entregue";
  } else if (remainingTime <= 24 * 60 * 60 * 1000) {
    // Menos de 24 horas
    alertStatus = "proximo_vencimento";
  } else if (remainingTime <= 3 * 24 * 60 * 60 * 1000) {
    // Menos de 3 dias
    alertStatus = "aviso";
  }

  return {
    roomId,
    name: roomData.name,
    responsibleUserName: roomData.responsibleUserName,
    startDate: roomData.startDate,
    endDate: roomData.endDate,
    startTime: roomData.startTime,
    endTime: roomData.endTime,
    totalDuration,
    elapsedTime,
    remainingTime,
    usagePercentage: Math.round(usagePercentage),
    alertStatus,
    isDelivered: remainingTime <= 0,
  };
}

export async function getAllRoomsUsageStats() {
  const db = await getDb();
  if (!db) return [];

  const allRooms = await db.select().from(rooms).orderBy(asc(rooms.name));

  const stats = await Promise.all(
    (allRooms as any[]).map(room => getRoomUsageStats(room.id))
  );

  return stats.filter(stat => stat !== null);
}

// ============ RESERVAS DE SALAS ============

export async function listRoomReservations(filters?: {
  roomId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.roomId)
    conditions.push(eq(roomReservations.roomId, filters.roomId));
  if (filters?.status)
    conditions.push(eq(roomReservations.status, filters.status as any));

  let query = db.select().from(roomReservations);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(roomReservations.startTime))) as any;
}

export async function createRoomReservation(data: InsertRoomReservation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(roomReservations).values(data);
}

export async function updateRoomReservation(
  id: number,
  data: Partial<InsertRoomReservation>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(roomReservations)
    .set(data)
    .where(eq(roomReservations.id, id));
}

export async function deleteRoomReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(roomReservations).where(eq(roomReservations.id, id));
}

// ============ MANUTENÇÃO ============

export async function listMaintenanceRequests(filters?: {
  status?: string;
  priority?: string;
  assignedTo?: number;
  spaceId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status)
    conditions.push(eq(maintenanceRequests.status, filters.status as any));
  if (filters?.priority)
    conditions.push(eq(maintenanceRequests.priority, filters.priority as any));
  if (filters?.assignedTo)
    conditions.push(eq(maintenanceRequests.assignedTo, filters.assignedTo));
  if (filters?.spaceId)
    conditions.push(eq(maintenanceRequests.spaceId, filters.spaceId));

  let query = db.select().from(maintenanceRequests);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(maintenanceRequests.createdAt))) as any;
}

export async function getMaintenanceRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(maintenanceRequests)
    .where(eq(maintenanceRequests.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createMaintenanceRequest(data: InsertMaintenanceRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(maintenanceRequests).values(data);
}

export async function updateMaintenanceRequest(
  id: number,
  data: Partial<InsertMaintenanceRequest>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(maintenanceRequests)
    .set(data)
    .where(eq(maintenanceRequests.id, id));
}

export async function deleteMaintenanceRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
}

// ============ MAINTENANCE SPACES ============

export async function listMaintenanceSpaces() {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(maintenanceSpaces)
    .orderBy(asc(maintenanceSpaces.name))) as any;
}

export async function createMaintenanceSpace(data: {
  name: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(maintenanceSpaces).values(data);
  return result;
}

export async function updateMaintenanceSpace(
  id: number,
  data: { name?: string; description?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(maintenanceSpaces)
    .set(data)
    .where(eq(maintenanceSpaces.id, id));
}

export async function deleteMaintenanceSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remover todas as requisições de manutenção da unidade
  await db
    .delete(maintenanceRequests)
    .where(eq(maintenanceRequests.spaceId, id));

  // Remover unidade
  return db.delete(maintenanceSpaces).where(eq(maintenanceSpaces.id, id));
}

// ============ FORNECEDORES ============

export async function listSuppliers(filters?: {
  category?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status)
    conditions.push(eq(suppliers.status, filters.status as any));

  let query = db.select().from(suppliers);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(suppliers.companyName))) as any;
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliers).values(data);
}

export async function updateSupplier(
  id: number,
  data: Partial<InsertSupplier>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(suppliers).where(eq(suppliers.id, id));
}

// ============ CONTRATOS ============

// Função removida - usar listContractsWithSpace para contratos por unidade

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(contracts).values(data);
}

export async function updateContract(
  id: number,
  data: Partial<InsertContract>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(contracts).set(data).where(eq(contracts.id, id));
}

export async function deleteContract(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(contracts).where(eq(contracts.id, id));
}

// ============ CONSUMÍVEIS ============

export async function listConsumables(filters?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category)
    conditions.push(eq(consumables.category, filters.category));
  if (filters?.status)
    conditions.push(eq(consumables.status, filters.status as any));
  if (filters?.search)
    conditions.push(like(consumables.name, `%${filters.search}%`));

  let query = db.select().from(consumables);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(consumables.createdAt))) as any;
}

export async function getConsumableById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(consumables)
    .where(eq(consumables.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createConsumable(data: InsertConsumable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consumables).values(data);
  return result;
}

export async function updateConsumable(
  id: number,
  data: Partial<InsertConsumable>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumables).set(data).where(eq(consumables.id, id));
}

export async function deleteConsumable(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumables).where(eq(consumables.id, id));
}

// Weekly consumables
export async function listConsumablesWeekly(filters?: {
  consumableId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.consumableId)
    conditions.push(eq(consumablesWeekly.consumableId, filters.consumableId));

  let query = db.select().from(consumablesWeekly);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(consumablesWeekly.weekStartDate))) as any;
}

export async function createConsumableWeekly(data: InsertConsumableWeekly) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumablesWeekly).values(data);
}

export async function updateConsumableWeekly(
  id: number,
  data: Partial<InsertConsumableWeekly>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumablesWeekly)
    .set(data)
    .where(eq(consumablesWeekly.id, id));
}

// Monthly consumables
export async function listConsumablesMonthly(filters?: {
  consumableId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.consumableId)
    conditions.push(eq(consumablesMonthly.consumableId, filters.consumableId));

  let query = db.select().from(consumablesMonthly);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(consumablesMonthly.monthStartDate))) as any;
}

export async function createConsumableMonthly(data: InsertConsumableMonthly) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumablesMonthly).values(data);
}

export async function updateConsumableMonthly(
  id: number,
  data: Partial<InsertConsumableMonthly>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumablesMonthly)
    .set(data)
    .where(eq(consumablesMonthly.id, id));
}

// Consumable Spaces
export async function listConsumableSpaces() {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(consumableSpaces)
    .orderBy(asc(consumableSpaces.name))) as any;
}

export async function createConsumableSpace(data: InsertConsumableSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consumableSpaces).values(data);
  return result;
}

export async function updateConsumableSpace(
  id: number,
  data: Partial<InsertConsumableSpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumableSpaces)
    .set(data)
    .where(eq(consumableSpaces.id, id));
}

export async function deleteConsumableSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar consumiveis da unidade
  const consumables = await db
    .select()
    .from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, id));

  // Remover dependencias
  for (const consumable of consumables) {
    await db
      .delete(consumableStockAuditLog)
      .where(eq(consumableStockAuditLog.consumableId, consumable.id));
    await db
      .delete(consumableWeeklyMovements)
      .where(eq(consumableWeeklyMovements.consumableId, consumable.id));
  }

  // Remover consumiveis
  await db
    .delete(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, id));

  // Remover fornecedores da unidade
  await db.delete(suppliersWithSpace).where(eq(suppliersWithSpace.spaceId, id));

  // Remover unidade
  return db.delete(consumableSpaces).where(eq(consumableSpaces.id, id));
}

// Consumables with Space
export async function listConsumablesWithSpace(filters?: {
  spaceId?: number;
  search?: string;
  category?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.spaceId)
    conditions.push(eq(consumablesWithSpace.spaceId, filters.spaceId));
  if (filters?.search)
    conditions.push(like(consumablesWithSpace.name, `%${filters.search}%`));
  if (filters?.category)
    conditions.push(eq(consumablesWithSpace.category, filters.category));

  let query = db.select().from(consumablesWithSpace);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(consumablesWithSpace.name))) as any;
}

export async function createConsumableWithSpace(
  data: InsertConsumableWithSpace
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumablesWithSpace).values(data);
}

export async function updateConsumableWithSpace(
  id: number,
  data: Partial<InsertConsumableWithSpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumablesWithSpace)
    .set(data)
    .where(eq(consumablesWithSpace.id, id));
}

export async function deleteConsumableWithSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumablesWithSpace).where(eq(consumablesWithSpace.id, id));
}

// Movimentações Semanais de Consumíveis
export async function getConsumableWeeklyMovements(
  spaceId?: number,
  consumableId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(consumableWeeklyMovements);
  const conditions = [];

  if (spaceId) {
    conditions.push(eq(consumableWeeklyMovements.spaceId, spaceId));
  }
  if (consumableId) {
    conditions.push(eq(consumableWeeklyMovements.consumableId, consumableId));
  }

  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(
    desc(consumableWeeklyMovements.weekStartDate)
  )) as any;
}

export async function createConsumableWeeklyMovement(
  data: InsertConsumableWeeklyMovement
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumableWeeklyMovements).values(data);
}

export async function updateConsumableWeeklyMovement(
  id: number,
  data: Partial<InsertConsumableWeeklyMovement>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumableWeeklyMovements)
    .set(data)
    .where(eq(consumableWeeklyMovements.id, id));
}

export async function deleteConsumableWeeklyMovement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(consumableWeeklyMovements)
    .where(eq(consumableWeeklyMovements.id, id));
}

// Movimentações Mensais de Consumíveis
export async function getConsumableMonthlyMovements(
  spaceId?: number,
  consumableId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(consumableMonthlyMovements);
  const conditions = [];

  if (spaceId) {
    conditions.push(eq(consumableMonthlyMovements.spaceId, spaceId));
  }
  if (consumableId) {
    conditions.push(eq(consumableMonthlyMovements.consumableId, consumableId));
  }

  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(
    desc(consumableMonthlyMovements.monthStartDate)
  )) as any;
}

export async function createConsumableMonthlyMovement(
  data: InsertConsumableMonthlyMovement
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumableMonthlyMovements).values(data);
}

export async function updateConsumableMonthlyMovement(
  id: number,
  data: Partial<InsertConsumableMonthlyMovement>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(consumableMonthlyMovements)
    .set(data)
    .where(eq(consumableMonthlyMovements.id, id));
}

export async function deleteConsumableMonthlyMovement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(consumableMonthlyMovements)
    .where(eq(consumableMonthlyMovements.id, id));
}

// Carregar consumíveis com dados semanais específicos
export async function listConsumablesWithWeeklyData(filters?: {
  spaceId?: number;
  search?: string;
  category?: string;
  weekStartDate?: string | Date;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  // Primeiro, obter todos os consumíveis da unidade
  const conditions = [];
  if (filters?.spaceId)
    conditions.push(eq(consumablesWithSpace.spaceId, filters.spaceId));
  if (filters?.search)
    conditions.push(like(consumablesWithSpace.name, `%${filters.search}%`));
  if (filters?.category)
    conditions.push(eq(consumablesWithSpace.category, filters.category));

  let query = db.select().from(consumablesWithSpace);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  const consumables = (await query.orderBy(
    asc(consumablesWithSpace.name)
  )) as any[];

  // Se não houver data de semana, retornar consumíveis com dados atuais
  if (!filters?.weekStartDate || !filters?.spaceId) {
    return consumables;
  }

  // Para cada consumível, buscar dados da semana específica
  // Converter weekStartDate para string DD-MM-YYYY para busca no banco
  let weekStartDateStr: string;
  if (typeof filters.weekStartDate === "string") {
    if (filters.weekStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = filters.weekStartDate.split("-");
      weekStartDateStr = `${day}-${month}-${year}`;
    } else {
      weekStartDateStr = filters.weekStartDate;
    }
  } else {
    const d = new Date(filters.weekStartDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    weekStartDateStr = `${day}-${month}-${year}`;
  }

  const weekData = await db
    .select()
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.spaceId, filters.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, weekStartDateStr)
      )
    );

  // Para cada consumível, buscar dados da semana anterior como fallback
  const [prevDay, prevMonth, prevYear] = weekStartDateStr
    .split("-")
    .map(Number);
  const previousWeekDateObj = new Date(prevYear, prevMonth - 1, prevDay - 7);
  const prevDayStr = String(previousWeekDateObj.getDate()).padStart(2, "0");
  const prevMonthStr = String(previousWeekDateObj.getMonth() + 1).padStart(
    2,
    "0"
  );
  const previousWeekDate = `${prevDayStr}-${prevMonthStr}-${previousWeekDateObj.getFullYear()}`;
  const previousWeekData = await db
    .select()
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.spaceId, filters.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, previousWeekDate)
      )
    );

  // Mapear dados semanais aos consumiveis com estoque cumulativo
  return consumables.map((consumable: any) => {
    const weeklyRecord = weekData.find(
      (w: any) => w.consumableId === consumable.id
    );

    if (weeklyRecord) {
      // Se houver registro da semana, usar seu valor (permitir 0)
      return {
        ...consumable,
        currentStock:
          weeklyRecord.totalMovement !== null &&
          weeklyRecord.totalMovement !== undefined
            ? weeklyRecord.totalMovement
            : consumable.currentStock,
        weeklyData: weeklyRecord,
      };
    }

    // Se não houver registro da semana, buscar da semana anterior
    const previousRecord = previousWeekData.find(
      (w: any) => w.consumableId === consumable.id
    );
    if (previousRecord) {
      return {
        ...consumable,
        currentStock:
          previousRecord.totalMovement !== null &&
          previousRecord.totalMovement !== undefined
            ? previousRecord.totalMovement
            : consumable.currentStock,
        weeklyData: null,
      };
    }

    // Se não houver em nenhuma semana, usar estoque atual do consumível
    return {
      ...consumable,
      currentStock: consumable.currentStock,
    };
  });
}

// Criar ou atualizar estoque semanal
export async function upsertConsumableWeeklyStock(data: {
  consumableId: number;
  spaceId: number;
  weekStartDate: string | Date;
  currentStock: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Normalizar weekStartDate para string DD-MM-YYYY
  let weekStartStr: string;
  if (typeof data.weekStartDate === "string") {
    // Se já é YYYY-MM-DD, converter para DD-MM-YYYY
    if (data.weekStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = data.weekStartDate.split("-");
      weekStartStr = `${day}-${month}-${year}`;
    } else if (
      data.weekStartDate.includes("-") &&
      data.weekStartDate.split("-")[0].length === 2
    ) {
      // Já está em DD-MM-YYYY
      weekStartStr = data.weekStartDate;
    } else {
      // Parse de outro formato como "Mon Mar 30 2026..."
      const d = new Date(data.weekStartDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      weekStartStr = `${day}-${month}-${year}`;
    }
  } else {
    // É Date object
    const d = new Date(data.weekStartDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    weekStartStr = `${day}-${month}-${year}`;
  }
  const existing = await db
    .select()
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, weekStartStr)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Atualizar registro existente - substituir o valor do dia
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

    const dayFieldMap: Record<number, any> = {
      1: consumableWeeklyMovements.mondayStock,
      2: consumableWeeklyMovements.tuesdayStock,
      3: consumableWeeklyMovements.wednesdayStock,
      4: consumableWeeklyMovements.thursdayStock,
      5: consumableWeeklyMovements.fridayStock,
      6: consumableWeeklyMovements.saturdayStock,
      0: consumableWeeklyMovements.sundayStock,
    };

    const dayField = dayFieldMap[dayOfWeek];
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dayField) {
      updateData[dayField.name] = data.currentStock;
    }

    // totalMovement deve ser apenas o valor atual, não soma
    updateData.totalMovement = data.currentStock;

    return db
      .update(consumableWeeklyMovements)
      .set(updateData)
      .where(eq(consumableWeeklyMovements.id, existing[0].id));
  } else {
    // Criar novo registro
    const [day, month, year] = weekStartStr.split("-").map(Number);
    const weekStartDate = new Date(year, month - 1, day);
    const weekNumber = Math.ceil(weekStartDate.getDate() / 7);
    const yearNum = weekStartDate.getFullYear();

    // Determinar qual dia da semana é hoje
    const today = new Date();
    const dayOfWeek = today.getDay();

    const dayFieldMap: Record<number, any> = {
      1: { field: "mondayStock", value: data.currentStock },
      2: { field: "tuesdayStock", value: data.currentStock },
      3: { field: "wednesdayStock", value: data.currentStock },
      4: { field: "thursdayStock", value: data.currentStock },
      5: { field: "fridayStock", value: data.currentStock },
      6: { field: "saturdayStock", value: data.currentStock },
      0: { field: "sundayStock", value: data.currentStock },
    };

    const dayData = dayFieldMap[dayOfWeek] || {
      field: "mondayStock",
      value: data.currentStock,
    };

    const insertData: any = {
      consumableId: data.consumableId,
      spaceId: data.spaceId,
      weekStartDate: weekStartStr,
      weekNumber,
      year: yearNum,
      totalMovement: data.currentStock,
      status: "ESTOQUE_OK",
      mondayStock: 0,
      tuesdayStock: 0,
      wednesdayStock: 0,
      thursdayStock: 0,
      fridayStock: 0,
      saturdayStock: 0,
      sundayStock: 0,
    };

    insertData[dayData.field] = dayData.value;

    return db.insert(consumableWeeklyMovements).values(insertData);
  }
}

// Histórico de Alterações de Estoque
export async function getStockAuditLog(filters?: {
  spaceId?: number;
  consumableId?: number;
  weekStartDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];

  if (filters?.spaceId) {
    conditions.push(eq(consumableStockAuditLog.spaceId, filters.spaceId));
  }
  if (filters?.consumableId) {
    conditions.push(
      eq(consumableStockAuditLog.consumableId, filters.consumableId)
    );
  }
  if (filters?.weekStartDate) {
    const weekStartStr =
      filters.weekStartDate instanceof Date
        ? filters.weekStartDate.toISOString().split("T")[0]
        : filters.weekStartDate;
    conditions.push(eq(consumableStockAuditLog.weekStartDate, weekStartStr));
  }

  let query = db.select().from(consumableStockAuditLog);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  // @ts-ignore - Drizzle ORM type inference issue
  query = query.orderBy(desc(consumableStockAuditLog.createdAt));

  if (filters?.limit) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.limit(filters.limit);
  }

  return (await query) as any;
}

export async function createStockAuditLog(data: InsertConsumableStockAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumableStockAuditLog).values(data);
}

export async function getStockAuditLogByWeeklyMovement(
  consumableWeeklyMovementId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return (await db
    .select()
    .from(consumableStockAuditLog)
    .where(
      eq(
        consumableStockAuditLog.consumableWeeklyMovementId,
        consumableWeeklyMovementId
      )
    )
    .orderBy(desc(consumableStockAuditLog.createdAt))) as any;
}

// Listar consumíveis com consumo mensal
export async function listConsumablesWithMonthlyConsumption(data: {
  spaceId: number;
  month: number;
  year: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Buscar todos os consumíveis da unidade
  const consumables = await db
    .select()
    .from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, data.spaceId))
    .orderBy(asc(consumablesWithSpace.name));

  // Para cada consumível, calcular consumo mensal
  const result = await Promise.all(
    consumables.map(async consumable => {
      const monthlyData = await calculateMonthlyConsumption({
        consumableId: consumable.id,
        spaceId: data.spaceId,
        month: data.month,
        year: data.year,
      });

      return {
        ...consumable,
        monthlyConsumption: monthlyData?.totalConsumption || 0,
        averageWeeklyConsumption: monthlyData?.averagePerWeek || 0,
        recommendedReplenishment:
          (consumable.maxStock || 0) - (monthlyData?.totalConsumption || 0),
      };
    })
  );

  return result;
}

// Calcular consumo mensal baseado no histórico semanal
export async function calculateMonthlyConsumption(data: {
  consumableId: number;
  spaceId: number;
  month: number;
  year: number;
}) {
  const db = await getDb();
  if (!db) return null;

  // Calcular semanas do mês
  const firstDay = new Date(data.year, data.month - 1, 1);
  const lastDay = new Date(data.year, data.month, 0);
  const firstWeek = Math.ceil(firstDay.getDate() / 7);
  const lastWeek = Math.ceil(lastDay.getDate() / 7);

  // Buscar todas as semanas do ano
  const allWeeklyRecords = await db
    .select()
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId),
        eq(consumableWeeklyMovements.year, data.year)
      )
    );

  // Filtrar apenas as semanas do mês
  const weeklyRecords = allWeeklyRecords.filter(
    (r: any) => r.weekNumber >= firstWeek && r.weekNumber <= lastWeek
  );

  // Calcular consumo total
  const totalMonthlyConsumption = weeklyRecords.reduce(
    (sum: number, record: any) => {
      return sum + (record.totalMovement || 0);
    },
    0
  );

  return {
    consumableId: data.consumableId,
    spaceId: data.spaceId,
    month: data.month,
    year: data.year,
    totalConsumption: totalMonthlyConsumption,
    weekCount: weeklyRecords.length,
    averagePerWeek:
      weeklyRecords.length > 0
        ? Math.round(totalMonthlyConsumption / weeklyRecords.length)
        : 0,
    weeklyBreakdown: weeklyRecords,
  };
}

// Buscar estoque cumulativo (estoque final da semana anterior)
export async function getPreviousWeekStock(data: {
  consumableId: number;
  spaceId: number;
  weekStartDate: string | Date;
}) {
  const db = await getDb();
  if (!db) return null;

  // Converter para Date se for string
  let weekDate: Date;
  if (typeof data.weekStartDate === "string") {
    const [year, month, day] = data.weekStartDate.split("-").map(Number);
    weekDate = new Date(year, month - 1, day);
  } else {
    weekDate = new Date(data.weekStartDate);
    weekDate.setHours(0, 0, 0, 0);
  }

  // Calcular data da semana anterior (7 dias antes)
  const previousWeekDate = new Date(
    weekDate.getTime() - 7 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  // Buscar registro da semana anterior
  const previousWeek = await db
    .select()
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, previousWeekDate)
      )
    )
    .limit(1);

  if (previousWeek.length > 0) {
    return previousWeek[0].totalMovement;
  }

  // Se não houver semana anterior, buscar estoque atual do consumível
  const consumable = await db
    .select()
    .from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.id, data.consumableId))
    .limit(1);

  return consumable.length > 0 ? consumable[0].currentStock : 0;
}

// Buscar histórico de estoque para gráfico de tendência (últimas 12 semanas)
export async function getConsumableStockHistory(data: {
  consumableId: number;
  spaceId: number;
  weeks?: number; // número de semanas a buscar (padrão 12)
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const weeksToFetch = data.weeks || 12;

  // Buscar registros das últimas N semanas
  const history = await db
    .select({
      weekStartDate: consumableWeeklyMovements.weekStartDate,
      weekNumber: consumableWeeklyMovements.weekNumber,
      year: consumableWeeklyMovements.year,
      totalMovement: consumableWeeklyMovements.totalMovement,
      status: consumableWeeklyMovements.status,
    })
    .from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId)
      )
    )
    .orderBy(consumableWeeklyMovements.weekStartDate)
    .limit(weeksToFetch);

  // Calcular consumo semanal (diferença entre semanas consecutivas)
  // O consumo é calculado como: estoque anterior - estoque atual
  const historyWithConsumption = history.map((record, index) => {
    let consumption = 0;

    if (index > 0) {
      const previousRecord = history[index - 1];
      // Se o estoque anterior é maior que o atual, houve consumo
      consumption = Math.max(
        0,
        previousRecord.totalMovement - record.totalMovement
      );
    }

    const weekStartStr =
      typeof record.weekStartDate === "string"
        ? record.weekStartDate
        : String(record.weekStartDate);

    return {
      weekStartDate: weekStartStr,
      weekNumber: record.weekNumber,
      year: record.year,
      stock: record.totalMovement, // Estoque atual da semana
      consumption: consumption, // Consumo calculado pela diferença
      status: record.status,
      label: `Sem ${record.weekNumber}/${record.year}`, // ex: "Sem 12/2026"
    };
  });

  return historyWithConsumption;
}

// Buscar dados agregados para análise de padrões
export async function getConsumableStockAnalysis(data: {
  consumableId: number;
  spaceId: number;
  weeks?: number;
}) {
  const history = await getConsumableStockHistory(data);

  if (history.length === 0) {
    return {
      averageConsumption: 0,
      maxConsumption: 0,
      minConsumption: 0,
      trend: "stable" as const,
      totalConsumption: 0,
    };
  }

  const consumptions = history.map(h => h.consumption);
  const totalConsumption = consumptions.reduce((a, b) => a + b, 0);
  const averageConsumption = totalConsumption / consumptions.length;
  const maxConsumption = Math.max(...consumptions);
  const minConsumption = Math.min(...consumptions);

  // Calcular tendência (crescente, decrescente ou estável)
  const recentConsumptions = consumptions.slice(-4); // últimas 4 semanas
  const recentAverage =
    recentConsumptions.reduce((a, b) => a + b, 0) / recentConsumptions.length;
  const olderConsumptions = consumptions.slice(0, -4);
  const olderAverage =
    olderConsumptions.length > 0
      ? olderConsumptions.reduce((a, b) => a + b, 0) / olderConsumptions.length
      : recentAverage;

  let trend: "increasing" | "decreasing" | "stable" = "stable";
  const difference = recentAverage - olderAverage;
  if (difference > olderAverage * 0.1) trend = "increasing";
  else if (difference < -olderAverage * 0.1) trend = "decreasing";

  return {
    averageConsumption: Math.round(averageConsumption * 100) / 100,
    maxConsumption,
    minConsumption,
    trend,
    totalConsumption,
  };
}

// Gerar dados completos para relatório semanal em PDF
export async function generateWeeklyReportData(data: {
  spaceId: number;
  weekStartDate: string | Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Converter para Date se for string
  let weekDate: Date;
  if (typeof data.weekStartDate === "string") {
    const [year, month, day] = data.weekStartDate.split("-").map(Number);
    weekDate = new Date(year, month - 1, day);
  } else {
    weekDate = new Date(data.weekStartDate);
    weekDate.setHours(0, 0, 0, 0);
  }

  // Buscar informações da unidade (space)
  const space = await db
    .select()
    .from(consumableSpaces)
    .where(eq(consumableSpaces.id, data.spaceId))
    .limit(1);

  if (space.length === 0) {
    throw new Error("Space not found");
  }

  // Buscar todos os consumíveis da unidade com dados da semana
  const consumables = await listConsumablesWithWeeklyData({
    spaceId: data.spaceId,
    weekStartDate: weekDate,
  });

  // Para cada consumível, buscar histórico e análise
  const consumablesWithAnalysis = await Promise.all(
    consumables.map(async consumable => {
      const history = await getConsumableStockHistory({
        consumableId: consumable.id,
        spaceId: data.spaceId,
        weeks: 4, // últimas 4 semanas
      });

      const analysis = await getConsumableStockAnalysis({
        consumableId: consumable.id,
        spaceId: data.spaceId,
        weeks: 4,
      });

      return {
        ...consumable,
        history,
        analysis,
      };
    })
  );

  // Calcular estatísticas gerais
  const totalConsumables = consumablesWithAnalysis.length;
  const criticalStock = consumablesWithAnalysis.filter(
    c => c.currentStock < c.minStock
  ).length;
  const lowStock = consumablesWithAnalysis.filter(
    c => c.currentStock >= c.minStock && c.currentStock < c.maxStock * 0.3
  ).length;
  const normalStock = consumablesWithAnalysis.filter(
    c => c.currentStock >= c.maxStock * 0.3
  ).length;

  const totalAverageConsumption = consumablesWithAnalysis.reduce(
    (sum, c) => sum + c.analysis.averageConsumption,
    0
  );

  return {
    space: space[0],
    weekStartDate: weekDate,
    weekEndDate: new Date(weekDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    consumables: consumablesWithAnalysis,
    statistics: {
      totalConsumables,
      criticalStock,
      lowStock,
      normalStock,
      totalAverageConsumption: Math.round(totalAverageConsumption * 100) / 100,
    },
    generatedAt: new Date(),
  };
}

// ============ FORNECEDORES POR ESPAÇO ============

export async function listSuppliersWithSpace(spaceId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (spaceId) {
    return db
      .select()
      .from(suppliersWithSpace)
      .where(eq(suppliersWithSpace.spaceId, spaceId))
      .orderBy(asc(suppliersWithSpace.companyName));
  }
  return db
    .select()
    .from(suppliersWithSpace)
    .orderBy(asc(suppliersWithSpace.companyName));
}

export async function getSupplierWithSpaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(suppliersWithSpace)
    .where(eq(suppliersWithSpace.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createSupplierWithSpace(data: InsertSupplierWithSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliersWithSpace).values(data);
}

export async function updateSupplierWithSpace(
  id: number,
  data: Partial<InsertSupplierWithSpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(suppliersWithSpace)
    .set(data)
    .where(eq(suppliersWithSpace.id, id));
}

export async function deleteSupplierWithSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(suppliersWithSpace).where(eq(suppliersWithSpace.id, id));
}

// ============ ALERTAS DE ESTOQUE ============

export async function getStockAlerts(spaceId?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(consumablesWithSpace);

  if (spaceId) {
    query = query.where(eq(consumablesWithSpace.spaceId, spaceId)) as any;
  }

  const consumables = (await query) as any[];
  return processStockAlerts(consumables, db);
}

function buildOrEqCondition<T>(column: any, values: T[]) {
  if (values.length === 0) return undefined;
  if (values.length === 1) return eq(column, values[0] as any);
  return or(...values.map(value => eq(column, value as any)));
}

function getLatestStockByConsumable(
  consumables: any[],
  weeklyMovements: any[]
) {
  const latestByKey = new Map<string, any>();

  for (const movement of weeklyMovements) {
    const key = `${movement.spaceId ?? "null"}:${movement.consumableId}`;
    const previous = latestByKey.get(key);

    if (!previous) {
      latestByKey.set(key, movement);
      continue;
    }

    const previousUpdated = new Date(previous.updatedAt).getTime();
    const currentUpdated = new Date(movement.updatedAt).getTime();

    if (currentUpdated > previousUpdated) {
      latestByKey.set(key, movement);
    }
  }

  return consumables.map(consumable => {
    const key = `${consumable.spaceId ?? "null"}:${consumable.id}`;
    const latestMovement = latestByKey.get(key);
    const weeklyStock = latestMovement?.totalMovement;
    const currentStock =
      weeklyStock !== undefined && weeklyStock !== null
        ? Number(weeklyStock)
        : Number(consumable.currentStock ?? 0);

    return {
      ...consumable,
      currentStock: Number.isNaN(currentStock) ? 0 : currentStock,
    };
  });
}

async function withEffectiveCurrentStock(consumables: any[], db: any) {
  if (consumables.length === 0) return [];

  const spaceIds = Array.from(
    new Set(
      consumables
        .map(consumable => consumable.spaceId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  const consumableIds = consumables.map(consumable => consumable.id as number);

  const spaceCondition = buildOrEqCondition(
    consumableWeeklyMovements.spaceId,
    spaceIds
  );
  const consumableCondition = buildOrEqCondition(
    consumableWeeklyMovements.consumableId,
    consumableIds
  );

  const whereCondition =
    spaceCondition && consumableCondition
      ? and(spaceCondition, consumableCondition)
      : spaceCondition || consumableCondition;

  let weeklyQuery = db.select().from(consumableWeeklyMovements);
  if (whereCondition) {
    weeklyQuery = weeklyQuery.where(whereCondition) as any;
  }

  const weeklyMovements = (await weeklyQuery) as any[];
  return getLatestStockByConsumable(consumables, weeklyMovements);
}

async function processStockAlerts(consumables: any[], db: any) {
  const consumablesWithEffectiveStock = await withEffectiveCurrentStock(
    consumables,
    db
  );

  const spaceIds = Array.from(
    new Set(
      consumablesWithEffectiveStock
        .map(consumable => consumable.spaceId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  let spaceNameById = new Map<number, string>();
  if (spaceIds.length > 0) {
    const spaceCondition = buildOrEqCondition(consumableSpaces.id, spaceIds);
    let spacesQuery = db.select().from(consumableSpaces);

    if (spaceCondition) {
      spacesQuery = spacesQuery.where(spaceCondition) as any;
    }

    const spaces = (await spacesQuery) as any[];
    spaceNameById = new Map(
      spaces.map(space => [space.id, space.name] as [number, string])
    );
  }

  const alerts = consumablesWithEffectiveStock
    .map((consumable: any) => {
      const currentStock = consumable.currentStock || 0;
      const minStock = consumable.minStock || 0;

      let alertType = null;
      let message = "";

      // Apenas alerta quando estoque está abaixo do mínimo definido pelo usuário
      if (currentStock < minStock) {
        alertType = "critical";
        message = `Estoque abaixo do mínimo (${minStock} ${consumable.unit})`;
      }

      if (alertType) {
        return {
          id: consumable.id,
          name: consumable.name,
          category: consumable.category,
          currentStock,
          minStock,
          unit: consumable.unit,
          spaceName:
            spaceNameById.get(consumable.spaceId) ||
            consumable.spaceName ||
            "Sem unidade",
          spaceId: consumable.spaceId,
          alertType,
          message,
        };
      }

      return null;
    })
    .filter((alert: any) => alert !== null)
    .sort((a: any, b: any) => {
      // Ordenar por quantidade (menor primeiro)
      return a.currentStock - b.currentStock;
    });

  return alerts;
}

export async function getStockAlertsBySpace(spaceId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar consumíveis da unidade específica
  const consumables = (await db
    .select()
    .from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, spaceId))) as any[];

  const consumablesWithEffectiveStock = await withEffectiveCurrentStock(
    consumables,
    db
  );

  // Buscar informações da unidade
  const space = (
    await db
      .select()
      .from(consumableSpaces)
      .where(eq(consumableSpaces.id, spaceId))
      .limit(1)
  )[0];

  // Filtrar consumíveis com alertas
  const alerts = consumablesWithEffectiveStock
    .map((consumable: any) => {
      const currentStock = consumable.currentStock || 0;
      const minStock = consumable.minStock || 0;
      const criticalLevel = Math.floor(minStock * 0.5);

      let alertType = null;

      if (currentStock < criticalLevel) {
        alertType = "critical";
      } else if (currentStock < minStock) {
        alertType = "warning";
      }

      if (alertType) {
        return {
          id: consumable.id,
          name: consumable.name,
          category: consumable.category,
          currentStock,
          minStock,
          criticalLevel,
          unit: consumable.unit,
          spaceName: space?.name || "Sem unidade",
          spaceId: consumable.spaceId,
          alertType,
        };
      }

      return null;
    })
    .filter((alert: any) => alert !== null)
    .sort((a: any, b: any) => {
      if (a.alertType === "critical" && b.alertType !== "critical") return -1;
      if (a.alertType !== "critical" && b.alertType === "critical") return 1;
      return a.currentStock - b.currentStock;
    });

  return alerts;
}

// Contratos
function parseContractDate(value?: string | null) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isContractExpiredByDate(endDate?: string | null) {
  const parsedEndDate = parseContractDate(endDate);
  if (!parsedEndDate) return false;

  const endDateOnly = new Date(parsedEndDate);
  endDateOnly.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return endDateOnly < today;
}

async function syncExpiredContractsStatus(db: any) {
  const allContracts = (await db
    .select({
      id: contracts.id,
      endDate: contracts.endDate,
      status: contracts.status,
    })
    .from(contracts)) as Array<{
    id: number;
    endDate: string | null;
    status: string;
  }>;

  const expiredContractIds = allContracts
    .filter(
      contract =>
        contract.status !== "vencido" &&
        isContractExpiredByDate(contract.endDate)
    )
    .map(contract => contract.id);

  for (const contractId of expiredContractIds) {
    await db
      .update(contracts)
      .set({ status: "vencido" })
      .where(eq(contracts.id, contractId));
  }
}

export async function listContractsWithSpace(filters?: {
  spaceId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  await syncExpiredContractsStatus(db);

  const conditions = [];
  if (filters?.spaceId)
    conditions.push(eq(contractsWithSpace.spaceId, filters.spaceId));
  if (filters?.search)
    conditions.push(like(contracts.companyName, `%${filters.search}%`));

  const rows = await db
    .select()
    .from(contractsWithSpace)
    .innerJoin(contracts, eq(contractsWithSpace.contractId, contracts.id))
    .leftJoin(contractSpaces, eq(contractsWithSpace.spaceId, contractSpaces.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contractsWithSpace.createdAt));

  return rows.map((row: any) => {
    const relation = row.contractsWithSpace ?? row.contracts_with_space;
    const space = row.contractSpaces ?? row.contract_spaces;

    return {
      ...row.contracts,
      spaceId: relation?.spaceId,
      contractId: relation?.contractId,
      linkedAt: relation?.createdAt,
      spaceName: space?.name || "Sem unidade",
    };
  });
}

export async function getContractWithSpaceById(contractId: number) {
  const db = await getDb();
  if (!db) return null;

  await syncExpiredContractsStatus(db);

  const rows = await db
    .select()
    .from(contractsWithSpace)
    .innerJoin(contracts, eq(contractsWithSpace.contractId, contracts.id))
    .leftJoin(contractSpaces, eq(contractsWithSpace.spaceId, contractSpaces.id))
    .where(eq(contractsWithSpace.contractId, contractId))
    .limit(1);

  if (rows.length === 0) return null;

  const row: any = rows[0];
  const relation = row.contractsWithSpace ?? row.contracts_with_space;
  const space = row.contractSpaces ?? row.contract_spaces;

  return {
    ...row.contracts,
    spaceId: relation?.spaceId,
    contractId: relation?.contractId,
    linkedAt: relation?.createdAt,
    spaceName: space?.name || "Sem unidade",
  };
}

export async function createContractWithSpace(
  spaceId: number,
  contract: InsertContract
): Promise<{ contractId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const createdContract = await db
    .insert(contracts)
    .values(contract)
    .returning({ id: contracts.id });

  if (!createdContract || !createdContract[0]) {
    throw new Error("Failed to retrieve contract ID after insertion");
  }

  const contractId = createdContract[0].id;

  await db.insert(contractsWithSpace).values({
    spaceId,
    contractId,
  });

  return { contractId };
}

export async function updateContractWithSpace(
  contractId: number,
  updates: Partial<InsertContract>,
  spaceId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contracts).set(updates).where(eq(contracts.id, contractId));

  if (spaceId !== undefined) {
    await db
      .update(contractsWithSpace)
      .set({ spaceId })
      .where(eq(contractsWithSpace.contractId, contractId));
  }
}

export async function deleteContractWithSpace(
  contractId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(contractsWithSpace)
    .where(eq(contractsWithSpace.contractId, contractId));

  await db.delete(contracts).where(eq(contracts.id, contractId));
}

export async function getContractAlerts(spaceId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (spaceId) conditions.push(eq(contractAlerts.spaceId, spaceId));
  conditions.push(eq(contractAlerts.isResolved, false));

  return db
    .select()
    .from(contractAlerts)
    .innerJoin(contracts, eq(contractAlerts.contractId, contracts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(contractAlerts.daysUntilEvent));
}

export async function generateContractAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await syncExpiredContractsStatus(db);

  const today = new Date();

  // Buscar todos os contratos ativos
  const activeContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.status, "ativo"));

  for (const contract of activeContracts) {
    const endDate = parseContractDate(contract.endDate);
    if (!endDate) continue;

    const daysUntilExpiry = Math.floor(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alertas de vencimento de contrato (30 dias antes)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      const spaces = await db
        .select()
        .from(contractsWithSpace)
        .where(eq(contractsWithSpace.contractId, contract.id));

      for (const space of spaces) {
        if (space.spaceId == null) continue;

        const existingAlert = await db
          .select()
          .from(contractAlerts)
          .where(
            and(
              eq(contractAlerts.contractId, contract.id),
              eq(contractAlerts.spaceId, space.spaceId),
              eq(contractAlerts.alertType, "contract_expiry"),
              eq(contractAlerts.isResolved, false)
            )
          );

        if (existingAlert.length === 0) {
          await db.insert(contractAlerts).values({
            contractId: contract.id,
            spaceId: space.spaceId,
            alertType: "contract_expiry",
            daysUntilEvent: daysUntilExpiry,
          });
        }
      }
    }

    // Alertas de pagamento mensal (dia anterior)
    if (contract.contractType === "mensal" && contract.monthlyPaymentDate) {
      const today = new Date();
      const nextPaymentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        contract.monthlyPaymentDate
      );

      if (nextPaymentDate < today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      const daysUntilPayment = Math.floor(
        (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilPayment === 1) {
        const spaces = await db
          .select()
          .from(contractsWithSpace)
          .where(eq(contractsWithSpace.contractId, contract.id));

        for (const space of spaces) {
          if (space.spaceId == null) continue;

          const existingAlert = await db
            .select()
            .from(contractAlerts)
            .where(
              and(
                eq(contractAlerts.contractId, contract.id),
                eq(contractAlerts.spaceId, space.spaceId),
                eq(contractAlerts.alertType, "monthly_payment"),
                eq(contractAlerts.isResolved, false)
              )
            );

          if (existingAlert.length === 0) {
            await db.insert(contractAlerts).values({
              contractId: contract.id,
              spaceId: space.spaceId,
              alertType: "monthly_payment",
              daysUntilEvent: 1,
            });
          }
        }
      }
    }
  }
}

// ============ SUPPLIER SPACES ============
export async function listSupplierSpaces() {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(supplierSpaces)
    .orderBy(asc(supplierSpaces.name))) as any;
}

export async function createSupplierSpace(data: InsertSupplierSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supplierSpaces).values(data);
  return result;
}

export async function updateSupplierSpace(
  id: number,
  data: Partial<InsertSupplierSpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(supplierSpaces).set(data).where(eq(supplierSpaces.id, id));
}

export async function deleteSupplierSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remover fornecedores da unidade
  await db.delete(suppliersWithSpace).where(eq(suppliersWithSpace.spaceId, id));

  // Remover unidade
  return db.delete(supplierSpaces).where(eq(supplierSpaces.id, id));
}

// ============ CONTRACT SPACES ============
export async function listContractSpaces() {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(contractSpaces)
    .orderBy(asc(contractSpaces.name))) as any;
}

export async function createContractSpace(data: InsertContractSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contractSpaces).values(data);
  return result;
}

export async function updateContractSpace(
  id: number,
  data: Partial<InsertContractSpace>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(contractSpaces).set(data).where(eq(contractSpaces.id, id));
}

export async function deleteContractSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remover contratos da unidade
  await db.delete(contractsWithSpace).where(eq(contractsWithSpace.spaceId, id));

  // Remover alertas de contratos
  await db.delete(contractAlerts).where(eq(contractAlerts.spaceId, id));

  // Remover unidade
  return db.delete(contractSpaces).where(eq(contractSpaces.id, id));
}

// ============ AUTENTICAÇÃO E AUTORIZAÇÃO ============

export async function getUserByEmail(email: string) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

export async function getUserById(id: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(users)
    .set({ password: passwordHash })
    .where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: string) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(users)
    .set({ role: role as any })
    .where(eq(users.id, userId));
}

export async function updateUserActive(userId: number, isActive: boolean) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(users).set({ isActive }).where(eq(users.id, userId));
}

export async function updateUserLastLogin(userId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(users)
    .set({ lastLogin: new Date(), lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserLastSeen(userId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function listUsers(filters?: {
  role?: string;
  isActive?: boolean;
}) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.role) conditions.push(eq(users.role, filters.role as any));
  if (filters?.isActive !== undefined)
    conditions.push(eq(users.isActive, filters.isActive));

  let query = db.select().from(users);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(users.name))) as any;
}

export async function createUser(data: InsertUser) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(users).values(data);
}

export async function listUserInvitations() {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return [];

  return (await db
    .select()
    .from(userInvitations)
    .orderBy(desc(userInvitations.createdAt))) as any;
}

export async function getUserInvitationByToken(token: string) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.token, token))
    .limit(1);

  return result[0] || null;
}

export async function getUserInvitationById(invitationId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.id, invitationId))
    .limit(1);

  return result[0] || null;
}

export async function createUserInvitation(data: InsertUserInvitation) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userInvitations)
    .set({
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userInvitations.email, data.email),
        eq(userInvitations.status, "pending")
      )
    );

  return db.insert(userInvitations).values(data);
}

export async function revokeUserInvitation(invitationId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(userInvitations)
    .set({
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(eq(userInvitations.id, invitationId));
}

export async function markUserInvitationAccepted(invitationId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(userInvitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userInvitations.id, invitationId));
}

export async function deleteUserInvitation(invitationId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(userInvitations).where(eq(userInvitations.id, invitationId));
}

export async function expireOverdueInvitations() {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(userInvitations)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userInvitations.status, "pending"),
        lte(userInvitations.expiresAt, new Date())
      )
    );
}

export async function updateUserByEmail(
  email: string,
  data: {
    name?: string | null;
    password?: string | null;
    role?: string;
    loginMethod?: string | null;
    isActive?: boolean;
  }
) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.password !== undefined) updateData.password = data.password;
  if (data.role !== undefined) updateData.role = data.role as any;
  if (data.loginMethod !== undefined) updateData.loginMethod = data.loginMethod;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return db.update(users).set(updateData).where(eq(users.email, email));
}

export async function deleteUserById(userId: number) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(auditLog).set({ userId: null }).where(eq(auditLog.userId, userId));

  await db
    .update(userInvitations)
    .set({ invitedByUserId: null, updatedAt: new Date() })
    .where(eq(userInvitations.invitedByUserId, userId));

  return db.delete(users).where(eq(users.id, userId));
}

// ============ AUDITORIA ============

export interface InsertAuditLog {
  userId: number;
  action: "create" | "read" | "update" | "delete" | "login" | "logout";
  module: string;
  recordId?: number | null;
  recordName?: string | null;
  changes?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: "success" | "failed";
  errorMessage?: string | null;
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(auditLog).values(data);
}

export async function listAuditLogs(filters?: {
  userId?: number;
  module?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.userId) conditions.push(eq(auditLog.userId, filters.userId));
  if (filters?.module) conditions.push(eq(auditLog.module, filters.module));
  if (filters?.action)
    conditions.push(eq(auditLog.action, filters.action as any));

  // @ts-ignore - Drizzle ORM type inference issue
  let query: any = db.select().from(auditLog);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(auditLog.createdAt));

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.offset(filters.offset);

  return (await query) as any;
}

export async function listAuditLogsDetailed(filters?: {
  userId?: number;
  module?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  await ensureUsersAuthSchema();
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.userId !== undefined) {
    conditions.push(eq(auditLog.userId, filters.userId));
  }

  if (filters?.module) {
    conditions.push(eq(auditLog.module, filters.module));
  }

  if (filters?.action) {
    conditions.push(eq(auditLog.action, filters.action as any));
  }

  if (filters?.startDate) {
    conditions.push(gte(auditLog.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(auditLog.createdAt, filters.endDate));
  }

  let query: any = db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      module: auditLog.module,
      recordId: auditLog.recordId,
      recordName: auditLog.recordName,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      status: auditLog.status,
      errorMessage: auditLog.errorMessage,
      createdAt: auditLog.createdAt,
      userId: auditLog.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(desc(auditLog.createdAt));

  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.offset(filters.offset);

  const rows = (await query) as any[];

  return rows.map(row => ({
    id: row.id,
    action: row.action,
    module: row.module,
    recordId: row.recordId,
    recordName: row.recordName,
    changes: row.changes,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    status: row.status,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    user:
      row.userId !== null && row.userId !== undefined
        ? {
            id: row.userId,
            name: row.userName || "Usuário removido",
            email: row.userEmail,
            role: row.userRole,
          }
        : null,
  }));
}

export async function listAuditModules() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ module: auditLog.module })
    .from(auditLog)
    .groupBy(auditLog.module)
    .orderBy(asc(auditLog.module));

  return rows.map(row => row.module).filter(Boolean);
}

export async function getAuditLogsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)) as any;
}

export async function getAuditLogsByModule(module: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return (await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.module, module))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)) as any;
}
