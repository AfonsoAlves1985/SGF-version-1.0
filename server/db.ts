import { eq, and, or, desc, asc, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  inventory, inventoryMovements, InsertInventory, InsertInventoryMovement,
  teams, schedules, InsertTeam, InsertSchedule,
  rooms, roomReservations, InsertRoom, InsertRoomReservation,
  maintenanceRequests, InsertMaintenanceRequest,
  suppliers, InsertSupplier,
  suppliersWithSpace, InsertSupplierWithSpace,
  consumables, consumablesWeekly, consumablesMonthly, InsertConsumable, InsertConsumableWeekly, InsertConsumableMonthly,
  consumableSpaces, consumablesWithSpace, InsertConsumableSpace, InsertConsumableWithSpace,
  consumableWeeklyMovements, consumableMonthlyMovements, InsertConsumableWeeklyMovement, InsertConsumableMonthlyMovement,
  consumableStockAuditLog, InsertConsumableStockAuditLog,
  contracts, contractsWithSpace, contractAlerts, InsertContract, InsertContractWithSpace, InsertContractAlert
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

  if (filters?.status) conditions.push(eq(suppliers.status, filters.status as any));

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

// Função removida - usar listContractsWithSpace para contratos por unidade

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

  // Buscar consumiveis da unidade
  const consumables = await db.select().from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, id));

  // Remover dependencias
  for (const consumable of consumables) {
    await db.delete(consumableStockAuditLog)
      .where(eq(consumableStockAuditLog.consumableId, consumable.id));
    await db.delete(consumableWeeklyMovements)
      .where(eq(consumableWeeklyMovements.consumableId, consumable.id));
  }

  // Remover consumiveis
  await db.delete(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, id));

  // Remover fornecedores da unidade
  await db.delete(suppliersWithSpace)
    .where(eq(suppliersWithSpace.spaceId, id));

  // Remover unidade
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
export async function listConsumablesWithWeeklyData(filters?: { spaceId?: number; search?: string; category?: string; weekStartDate?: string | Date }): Promise<any[]> {
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
  // Converter weekStartDate para Date se for string (YYYY-MM-DD)
  let weekStartDate = filters.weekStartDate;
  if (typeof weekStartDate === 'string') {
    const [year, month, day] = weekStartDate.split('-').map(Number);
    weekStartDate = new Date(year, month - 1, day);
  }
  
  const weekData = await db.select().from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.spaceId, filters.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, weekStartDate as Date)
      )
    );

  // Para cada consumível, buscar dados da semana anterior como fallback
  const previousWeekDate = new Date((weekStartDate as Date).getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekData = await db.select().from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.spaceId, filters.spaceId),
        eq(consumableWeeklyMovements.weekStartDate, previousWeekDate)
      )
    );

  // Mapear dados semanais aos consumiveis com estoque cumulativo
  return consumables.map((consumable: any) => {
    const weeklyRecord = weekData.find((w: any) => w.consumableId === consumable.id);
    
    if (weeklyRecord) {
      // Se houver registro da semana, usar seu valor (permitir 0)
      return {
        ...consumable,
        currentStock: weeklyRecord.totalMovement !== null && weeklyRecord.totalMovement !== undefined ? weeklyRecord.totalMovement : consumable.currentStock,
        weeklyData: weeklyRecord,
      };
    }
    
    // Se não houver registro da semana, buscar da semana anterior
    const previousRecord = previousWeekData.find((w: any) => w.consumableId === consumable.id);
    if (previousRecord) {
      return {
        ...consumable,
        currentStock: previousRecord.totalMovement !== null && previousRecord.totalMovement !== undefined ? previousRecord.totalMovement : consumable.currentStock,
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

  // Normalizar weekStartDate para DATE sem timezone
  let weekStart: Date;
  if (typeof data.weekStartDate === 'string') {
    // Parse como YYYY-MM-DD
    const [year, month, day] = data.weekStartDate.split('-').map(Number);
    weekStart = new Date(year, month - 1, day);
  } else {
    weekStart = new Date(data.weekStartDate);
    // Normalizar para meia-noite local
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



// Listar consumíveis com consumo mensal
export async function listConsumablesWithMonthlyConsumption(data: {
  spaceId: number;
  month: number;
  year: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Buscar todos os consumíveis da unidade
  const consumables = await db.select().from(consumablesWithSpace)
    .where(eq(consumablesWithSpace.spaceId, data.spaceId))
    .orderBy(asc(consumablesWithSpace.name));

  // Para cada consumível, calcular consumo mensal
  const result = await Promise.all(
    consumables.map(async (consumable) => {
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
        recommendedReplenishment: (consumable.maxStock || 0) - (monthlyData?.totalConsumption || 0),
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
  const allWeeklyRecords = await db.select().from(consumableWeeklyMovements)
    .where(
      and(
        eq(consumableWeeklyMovements.consumableId, data.consumableId),
        eq(consumableWeeklyMovements.spaceId, data.spaceId),
        eq(consumableWeeklyMovements.year, data.year)
      )
    );

  // Filtrar apenas as semanas do mês
  const weeklyRecords = allWeeklyRecords.filter((r: any) => r.weekNumber >= firstWeek && r.weekNumber <= lastWeek);

  // Calcular consumo total
  const totalMonthlyConsumption = weeklyRecords.reduce((sum: number, record: any) => {
    return sum + (record.totalMovement || 0);
  }, 0);

  return {
    consumableId: data.consumableId,
    spaceId: data.spaceId,
    month: data.month,
    year: data.year,
    totalConsumption: totalMonthlyConsumption,
    weekCount: weeklyRecords.length,
    averagePerWeek: weeklyRecords.length > 0 ? Math.round(totalMonthlyConsumption / weeklyRecords.length) : 0,
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
  if (typeof data.weekStartDate === 'string') {
    const [year, month, day] = data.weekStartDate.split('-').map(Number);
    weekDate = new Date(year, month - 1, day);
  } else {
    weekDate = new Date(data.weekStartDate);
    weekDate.setHours(0, 0, 0, 0);
  }

  // Calcular data da semana anterior (7 dias antes)
  const previousWeekDate = new Date(weekDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Buscar registro da semana anterior
  const previousWeek = await db.select().from(consumableWeeklyMovements)
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
  const consumable = await db.select().from(consumablesWithSpace)
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
  const history = await db.select({
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
  const historyWithConsumption = history.map((record, index) => {
    const previousRecord = index > 0 ? history[index - 1] : null;
    const consumption = previousRecord 
      ? previousRecord.totalMovement - record.totalMovement 
      : 0;

    const weekStartStr = record.weekStartDate instanceof Date
      ? record.weekStartDate.toISOString().split('T')[0]
      : typeof record.weekStartDate === 'string'
      ? record.weekStartDate
      : new Date(record.weekStartDate).toISOString().split('T')[0];

    return {
      weekStartDate: weekStartStr,
      weekNumber: record.weekNumber,
      year: record.year,
      stock: record.totalMovement,
      consumption: Math.max(0, consumption), // consumo não pode ser negativo
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
  const recentAverage = recentConsumptions.reduce((a, b) => a + b, 0) / recentConsumptions.length;
  const olderConsumptions = consumptions.slice(0, -4);
  const olderAverage = olderConsumptions.length > 0 
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
  if (typeof data.weekStartDate === 'string') {
    const [year, month, day] = data.weekStartDate.split('-').map(Number);
    weekDate = new Date(year, month - 1, day);
  } else {
    weekDate = new Date(data.weekStartDate);
    weekDate.setHours(0, 0, 0, 0);
  }

  // Buscar informações da unidade (space)
  const space = await db.select().from(consumableSpaces)
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
    consumables.map(async (consumable) => {
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
    return db.select().from(suppliersWithSpace)
      .where(eq(suppliersWithSpace.spaceId, spaceId))
      .orderBy(asc(suppliersWithSpace.companyName));
  }
  return db.select().from(suppliersWithSpace).orderBy(asc(suppliersWithSpace.companyName));
}

export async function getSupplierWithSpaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliersWithSpace).where(eq(suppliersWithSpace.id, id)).limit(1);
  return result[0] || null;
}

export async function createSupplierWithSpace(data: InsertSupplierWithSpace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(suppliersWithSpace).values(data);
}

export async function updateSupplierWithSpace(id: number, data: Partial<InsertSupplierWithSpace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(suppliersWithSpace).set(data).where(eq(suppliersWithSpace.id, id));
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

  // Buscar todos os consumíveis com espaço
  if (spaceId) {
    return db.select().from(consumablesWithSpace)
      .where(eq(consumablesWithSpace.spaceId, spaceId))
      .then((consumables: any[]) => processStockAlerts(consumables));
  }

  const consumables = (await db.select().from(consumablesWithSpace)) as any[];
  return processStockAlerts(consumables);
}

async function processStockAlerts(consumables: any[]) {

  const alerts = consumables
    .map((consumable: any) => {
      const currentStock = consumable.currentStock || 0;
      const minStock = consumable.minStock || 0;
      const criticalLevel = Math.floor(minStock * 0.5); // 50% do mínimo é crítico

      let alertType = null;
      let message = "";

      if (currentStock < criticalLevel) {
        alertType = "critical";
        message = `CRÍTICO: Estoque muito baixo`;
      } else if (currentStock < minStock) {
        alertType = "warning";
        message = `AVISO: Abaixo do nível recomendado`;
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
          spaceName: consumable.spaceName || "Sem unidade",
          spaceId: consumable.spaceId,
          alertType,
          message,
        };
      }

      return null;
    })
    .filter((alert: any) => alert !== null)
    .sort((a: any, b: any) => {
      // Ordenar críticos primeiro, depois avisos
      if (a.alertType === "critical" && b.alertType !== "critical") return -1;
      if (a.alertType !== "critical" && b.alertType === "critical") return 1;
      // Depois ordenar por quantidade (menor primeiro)
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

  // Buscar informações da unidade
  const space = (await db
    .select()
    .from(consumableSpaces)
    .where(eq(consumableSpaces.id, spaceId))
    .limit(1))[0];

  // Filtrar consumíveis com alertas
  const alerts = consumables
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
export async function listContractsWithSpace(filters?: { spaceId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.spaceId) conditions.push(eq(contractsWithSpace.spaceId, filters.spaceId));
  if (filters?.search) conditions.push(like(contracts.companyName, `%${filters.search}%`));

  return db.select()
    .from(contractsWithSpace)
    .innerJoin(contracts, eq(contractsWithSpace.contractId, contracts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contractsWithSpace.createdAt));
}

export async function createContractWithSpace(spaceId: number, contract: InsertContract): Promise<{ contractId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contracts).values(contract);
  const contractId = (result as any).insertId || (result as any)[0]?.id;
  
  if (!contractId) {
    throw new Error("Failed to get contract ID after insertion");
  }
  
  await db.insert(contractsWithSpace).values({
    spaceId,
    contractId: Number(contractId),
  });

  return { contractId: Number(contractId) };
}

export async function updateContractWithSpace(contractId: number, updates: Partial<InsertContract>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contracts)
    .set(updates)
    .where(eq(contracts.id, contractId));
}

export async function deleteContractWithSpace(contractId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(contractsWithSpace)
    .where(eq(contractsWithSpace.contractId, contractId));
  
  await db.delete(contracts)
    .where(eq(contracts.id, contractId));
}

export async function getContractAlerts(spaceId?: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (spaceId) conditions.push(eq(contractAlerts.spaceId, spaceId));
  conditions.push(eq(contractAlerts.isResolved, false));

  return db.select()
    .from(contractAlerts)
    .innerJoin(contracts, eq(contractAlerts.contractId, contracts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(contractAlerts.daysUntilEvent));
}

export async function generateContractAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const today = new Date();
  
  // Buscar todos os contratos ativos
  const activeContracts = await db.select()
    .from(contracts)
    .where(eq(contracts.status, "ativo"));

  for (const contract of activeContracts) {
    const endDate = new Date(contract.endDate);
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Alertas de vencimento de contrato (30 dias antes)
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      const spaces = await db.select()
        .from(contractsWithSpace)
        .where(eq(contractsWithSpace.contractId, contract.id));

      for (const space of spaces) {
        const existingAlert = await db.select()
          .from(contractAlerts)
          .where(and(
            eq(contractAlerts.contractId, contract.id),
            eq(contractAlerts.spaceId, space.spaceId),
            eq(contractAlerts.alertType, "contract_expiry"),
            eq(contractAlerts.isResolved, false)
          ));

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
      const nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), contract.monthlyPaymentDate);
      
      if (nextPaymentDate < today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      const daysUntilPayment = Math.floor((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilPayment === 1) {
        const spaces = await db.select()
          .from(contractsWithSpace)
          .where(eq(contractsWithSpace.contractId, contract.id));

        for (const space of spaces) {
          const existingAlert = await db.select()
            .from(contractAlerts)
            .where(and(
              eq(contractAlerts.contractId, contract.id),
              eq(contractAlerts.spaceId, space.spaceId),
              eq(contractAlerts.alertType, "monthly_payment"),
              eq(contractAlerts.isResolved, false)
            ));

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
