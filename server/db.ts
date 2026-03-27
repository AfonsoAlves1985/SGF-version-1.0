import { eq, and, or, desc, asc, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  inventory, inventoryMovements, InsertInventory, InsertInventoryMovement,
  teams, schedules, InsertTeam, InsertSchedule,
  rooms, roomReservations, InsertRoom, InsertRoomReservation,
  maintenanceRequests, InsertMaintenanceRequest,
  suppliers, contracts, InsertSupplier, InsertContract,
  consumables, consumablesWeekly, consumablesMonthly, InsertConsumable, InsertConsumableWeekly, InsertConsumableMonthly,
  consumableSpaces, consumablesWithSpace, InsertConsumableSpace, InsertConsumableWithSpace,
  consumableWeeklyMovements, consumableMonthlyMovements, InsertConsumableWeeklyMovement, InsertConsumableMonthlyMovement,
  consumableStockAuditLog, InsertConsumableStockAuditLog
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
  return _db;
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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ INVENTÁRIO ============

export async function listInventory(filters?: { category?: string; status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category) conditions.push(eq(inventory.category, filters.category));
  if (filters?.status) conditions.push(eq(inventory.status, filters.status as any));
  if (filters?.search) conditions.push(like(inventory.name, `%${filters.search}%`));

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
  const result = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return result[0] || null;
}

export async function createInventory(data: InsertInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inventory).values(data);
  return result;
}

export async function updateInventory(id: number, data: Partial<InsertInventory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(inventory).set(data).where(eq(inventory.id, id));
}

export async function deleteInventory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(inventory).where(eq(inventory.id, id));
}

export async function getInventoryMovements(inventoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inventoryMovements).where(eq(inventoryMovements.inventoryId, inventoryId)).orderBy(desc(inventoryMovements.createdAt));
}

export async function getAllInventoryMovements() {
  const db = await getDb();
  if (!db) return [];
  // @ts-ignore
  return await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt));
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

// ============ ESCALA ============

export async function listSchedules(filters?: { teamId?: number; date?: Date }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.teamId) conditions.push(eq(schedules.teamId, filters.teamId));
  if (filters?.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);
    conditions.push(and(gte(schedules.date, startOfDay), lte(schedules.date, endOfDay)));
  }

  let query = db.select().from(schedules);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(schedules.date))) as any;
}

export async function createSchedule(data: InsertSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(schedules).values(data);
}

export async function updateSchedule(id: number, data: Partial<InsertSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(schedules).set(data).where(eq(schedules.id, id));
}

export async function deleteSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(schedules).where(eq(schedules.id, id));
}

// ============ SALAS ============

export async function listRooms(filters?: { type?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.type) conditions.push(eq(rooms.type, filters.type as any));
  if (filters?.status) conditions.push(eq(rooms.status, filters.status as any));

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
  return db.insert(rooms).values(data);
}

export async function updateRoom(id: number, data: Partial<InsertRoom>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(rooms).set(data).where(eq(rooms.id, id));
}

export async function deleteRoom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(rooms).where(eq(rooms.id, id));
}

// ============ RESERVAS DE SALAS ============

export async function listRoomReservations(filters?: { roomId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.roomId) conditions.push(eq(roomReservations.roomId, filters.roomId));
  if (filters?.status) conditions.push(eq(roomReservations.status, filters.status as any));

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

export async function updateRoomReservation(id: number, data: Partial<InsertRoomReservation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(roomReservations).set(data).where(eq(roomReservations.id, id));
}

export async function deleteRoomReservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(roomReservations).where(eq(roomReservations.id, id));
}

// ============ MANUTENÇÃO ============

export async function listMaintenanceRequests(filters?: { status?: string; priority?: string; assignedTo?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.status) conditions.push(eq(maintenanceRequests.status, filters.status as any));
  if (filters?.priority) conditions.push(eq(maintenanceRequests.priority, filters.priority as any));
  if (filters?.assignedTo) conditions.push(eq(maintenanceRequests.assignedTo, filters.assignedTo));

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
  const result = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id)).limit(1);
  return result[0] || null;
}

export async function createMaintenanceRequest(data: InsertMaintenanceRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(maintenanceRequests).values(data);
}

export async function updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(maintenanceRequests).set(data).where(eq(maintenanceRequests.id, id));
}

export async function deleteMaintenanceRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
}

// ============ FORNECEDORES ============

export async function listSuppliers(filters?: { category?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category) conditions.push(eq(suppliers.category, filters.category));
  if (filters?.status) conditions.push(eq(suppliers.status, filters.status as any));

  let query = db.select().from(suppliers);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(suppliers.name))) as any;
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0] || null;
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliers).values(data);
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
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

export async function listContracts(filters?: { supplierId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.supplierId) conditions.push(eq(contracts.supplierId, filters.supplierId));
  if (filters?.status) conditions.push(eq(contracts.status, filters.status as any));

  let query = db.select().from(contracts);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(desc(contracts.endDate))) as any;
}

export async function getContractById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  return result[0] || null;
}

export async function createContract(data: InsertContract) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(contracts).values(data);
}

export async function updateContract(id: number, data: Partial<InsertContract>) {
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

export async function listConsumables(filters?: { category?: string; status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.category) conditions.push(eq(consumables.category, filters.category));
  if (filters?.status) conditions.push(eq(consumables.status, filters.status as any));
  if (filters?.search) conditions.push(like(consumables.name, `%${filters.search}%`));

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
  const result = await db.select().from(consumables).where(eq(consumables.id, id)).limit(1);
  return result[0] || null;
}

export async function createConsumable(data: InsertConsumable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consumables).values(data);
  return result;
}

export async function updateConsumable(id: number, data: Partial<InsertConsumable>) {
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
export async function listConsumablesWeekly(filters?: { consumableId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.consumableId) conditions.push(eq(consumablesWeekly.consumableId, filters.consumableId));

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

export async function updateConsumableWeekly(id: number, data: Partial<InsertConsumableWeekly>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumablesWeekly).set(data).where(eq(consumablesWeekly.id, id));
}

// Monthly consumables
export async function listConsumablesMonthly(filters?: { consumableId?: number }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.consumableId) conditions.push(eq(consumablesMonthly.consumableId, filters.consumableId));

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

export async function updateConsumableMonthly(id: number, data: Partial<InsertConsumableMonthly>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumablesMonthly).set(data).where(eq(consumablesMonthly.id, id));
}


// Consumable Spaces
export async function listConsumableSpaces() {
  const db = await getDb();
  if (!db) return [];
  return (await db.select().from(consumableSpaces).orderBy(asc(consumableSpaces.name))) as any;
}

export async function createConsumableSpace(data: InsertConsumableSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consumableSpaces).values(data);
  return result;
}

export async function updateConsumableSpace(id: number, data: Partial<InsertConsumableSpace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumableSpaces).set(data).where(eq(consumableSpaces.id, id));
}

export async function deleteConsumableSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumableSpaces).where(eq(consumableSpaces.id, id));
}

// Consumables with Space
export async function listConsumablesWithSpace(filters?: { spaceId?: number; search?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.spaceId) conditions.push(eq(consumablesWithSpace.spaceId, filters.spaceId));
  if (filters?.search) conditions.push(like(consumablesWithSpace.name, `%${filters.search}%`));
  if (filters?.category) conditions.push(eq(consumablesWithSpace.category, filters.category));

  let query = db.select().from(consumablesWithSpace);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  return (await query.orderBy(asc(consumablesWithSpace.name))) as any;
}

export async function createConsumableWithSpace(data: InsertConsumableWithSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumablesWithSpace).values(data);
}

export async function updateConsumableWithSpace(id: number, data: Partial<InsertConsumableWithSpace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumablesWithSpace).set(data).where(eq(consumablesWithSpace.id, id));
}

export async function deleteConsumableWithSpace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumablesWithSpace).where(eq(consumablesWithSpace.id, id));
}


// Movimentações Semanais de Consumíveis
export async function getConsumableWeeklyMovements(spaceId?: number, consumableId?: number) {
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

  return (await query.orderBy(desc(consumableWeeklyMovements.weekStartDate))) as any;
}

export async function createConsumableWeeklyMovement(data: InsertConsumableWeeklyMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumableWeeklyMovements).values(data);
}

export async function updateConsumableWeeklyMovement(id: number, data: Partial<InsertConsumableWeeklyMovement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumableWeeklyMovements).set(data).where(eq(consumableWeeklyMovements.id, id));
}

export async function deleteConsumableWeeklyMovement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumableWeeklyMovements).where(eq(consumableWeeklyMovements.id, id));
}

// Movimentações Mensais de Consumíveis
export async function getConsumableMonthlyMovements(spaceId?: number, consumableId?: number) {
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

  return (await query.orderBy(desc(consumableMonthlyMovements.monthStartDate))) as any;
}

export async function createConsumableMonthlyMovement(data: InsertConsumableMonthlyMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(consumableMonthlyMovements).values(data);
}

export async function updateConsumableMonthlyMovement(id: number, data: Partial<InsertConsumableMonthlyMovement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(consumableMonthlyMovements).set(data).where(eq(consumableMonthlyMovements.id, id));
}

export async function deleteConsumableMonthlyMovement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(consumableMonthlyMovements).where(eq(consumableMonthlyMovements.id, id));
}


// Carregar consumíveis com dados semanais específicos
export async function listConsumablesWithWeeklyData(filters?: { spaceId?: number; search?: string; category?: string; weekStartDate?: string | Date }) {
  const db = await getDb();
  if (!db) return [];

  // Primeiro, obter todos os consumíveis da unidade
  const conditions = [];
  if (filters?.spaceId) conditions.push(eq(consumablesWithSpace.spaceId, filters.spaceId));
  if (filters?.search) conditions.push(like(consumablesWithSpace.name, `%${filters.search}%`));
  if (filters?.category) conditions.push(eq(consumablesWithSpace.category, filters.category));

  let query = db.select().from(consumablesWithSpace);
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference issue
    query = query.where(and(...conditions));
  }

  const consumables = (await query.orderBy(asc(consumablesWithSpace.name))) as any[];

  // Se não houver data de semana, retornar consumíveis com dados atuais
  if (!filters?.weekStartDate || !filters?.spaceId) {
    return consumables;
  }

  // Para cada consumível, buscar dados da semana específica
  // Converter weekStartDate para Date se for string
  let weekStartDate = filters.weekStartDate;
  if (typeof weekStartDate === 'string') {
    weekStartDate = new Date(weekStartDate + 'T00:00:00Z');
  }
  
  const weekData = await db.select().from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.spaceId, filters.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, weekStartDate as Date)
      )
    );

  // Mapear dados semanais aos consumíveis
  return consumables.map(consumable => {
    const weeklyRecord = weekData.find((w: any) => w.consumableId === consumable.id);
    if (weeklyRecord) {
      return {
        ...consumable,
        currentStock: weeklyRecord.totalMovement || consumable.currentStock,
        weeklyData: weeklyRecord,
      };
    }
    return consumable;
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

  // Converter weekStartDate para Date se for string
  let weekStart: Date;
  if (typeof data.weekStartDate === 'string') {
    weekStart = new Date(data.weekStartDate + 'T00:00:00Z');
  } else {
    weekStart = new Date(data.weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
  }

  // Verificar se já existe registro para esta semana
  const existing = await db.select().from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, weekStart)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Atualizar registro existente
    return db.update(consumableWeeklyMovements)
      .set({
        totalMovement: data.currentStock,
        updatedAt: new Date(),
      })
      .where(eq(consumableWeeklyMovements.id, existing[0].id));
  } else {
    // Criar novo registro
    const weekNumber = Math.ceil((weekStart.getDate()) / 7);
    const year = weekStart.getFullYear();

    return db.insert(consumableWeeklyMovements).values({
      consumableId: data.consumableId,
      spaceId: data.spaceId,
      weekStartDate: weekStart,
      weekNumber,
      year,
      totalMovement: data.currentStock,
      status: "ESTOQUE_OK",
    });
  }
}


// Histórico de Alterações de Estoque
export async function getStockAuditLog(filters?: { spaceId?: number; consumableId?: number; weekStartDate?: Date; limit?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];

  if (filters?.spaceId) {
    conditions.push(eq(consumableStockAuditLog.spaceId, filters.spaceId));
  }
  if (filters?.consumableId) {
    conditions.push(eq(consumableStockAuditLog.consumableId, filters.consumableId));
  }
  if (filters?.weekStartDate) {
    conditions.push(eq(consumableStockAuditLog.weekStartDate, filters.weekStartDate));
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

export async function getStockAuditLogByWeeklyMovement(consumableWeeklyMovementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return (await db.select().from(consumableStockAuditLog)
    .where(eq(consumableStockAuditLog.consumableWeeklyMovementId, consumableWeeklyMovementId))
    .orderBy(desc(consumableStockAuditLog.createdAt))) as any;
}
