import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, datetime, foreignKey, date, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Inventário
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  minQuantity: int("minQuantity").notNull().default(5),
  unit: varchar("unit", { length: 50 }).notNull().default("unidade"),
  location: varchar("location", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ativo", "inativo", "descontinuado"]).default("ativo").notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// Movimentações de Inventário
export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventoryId").notNull(),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  quantity: int("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  inventoryFk: foreignKey({
    columns: [table.inventoryId],
    foreignColumns: [inventory.id],
  }),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// Equipa
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  role: mysqlEnum("role", ["limpeza", "manutencao", "admin"]).notNull(),
  sector: varchar("sector", { length: 100 }),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Escala
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  date: datetime("date").notNull(),
  shift: mysqlEnum("shift", ["manha", "tarde", "noite"]).notNull(),
  sector: varchar("sector", { length: 100 }),
  status: mysqlEnum("status", ["confirmada", "pendente", "cancelada"]).default("confirmada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  teamFk: foreignKey({
    columns: [table.teamId],
    foreignColumns: [teams.id],
  }),
}));

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// Salas
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  capacity: int("capacity").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["sala", "auditorio", "cozinha", "outro"]).notNull(),
  status: mysqlEnum("status", ["disponivel", "ocupada", "manutencao"]).default("disponivel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

// Reservas de Salas
export const roomReservations = mysqlTable("room_reservations", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  startTime: datetime("startTime").notNull(),
  endTime: datetime("endTime").notNull(),
  purpose: varchar("purpose", { length: 255 }),
  status: mysqlEnum("status", ["confirmada", "pendente", "cancelada"]).default("confirmada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  roomFk: foreignKey({
    columns: [table.roomId],
    foreignColumns: [rooms.id],
  }),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type RoomReservation = typeof roomReservations.$inferSelect;
export type InsertRoomReservation = typeof roomReservations.$inferInsert;

// Chamados de Manutenção
export const maintenanceRequests = mysqlTable("maintenance_requests", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  type: mysqlEnum("type", ["preventiva", "correctiva"]).notNull(),
  status: mysqlEnum("status", ["aberto", "em_progresso", "concluido", "cancelado"]).default("aberto").notNull(),
  assignedTo: int("assignedTo"),
  createdBy: int("createdBy").notNull(),
  completedAt: datetime("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  assignedToFk: foreignKey({
    columns: [table.assignedTo],
    foreignColumns: [teams.id],
  }),
  createdByFk: foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
  }),
}));

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = typeof maintenanceRequests.$inferInsert;

// Fornecedores
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  serviceTypes: json("serviceTypes").$type<string[]>().default([]).notNull(), // Seleção múltipla de tipos de serviço
  contact: varchar("contact", { length: 255 }).notNull(), // Telefone, email ou outro contato
  contactPerson: varchar("contactPerson", { length: 255 }).notNull(), // Com quem falar
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  notes: text("notes"), // Notas adicionais
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// Fornecedores por Espaço (Febracis, Lead Fit, etc.)
export const suppliersWithSpace = mysqlTable("suppliers_with_space", {
  id: int("id").autoincrement().primaryKey(),
  spaceId: int("spaceId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  serviceTypes: json("serviceTypes").$type<string[]>().notNull(),
  contact: varchar("contact", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  spaceFk: foreignKey({
    columns: [table.spaceId],
    foreignColumns: [consumableSpaces.id],
  }),
}));

export type SupplierWithSpace = typeof suppliersWithSpace.$inferSelect;
export type InsertSupplierWithSpace = typeof suppliersWithSpace.$inferInsert;

// Contratos
export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  startDate: datetime("startDate").notNull(),
  endDate: datetime("endDate").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["ativo", "expirado", "cancelado"]).default("ativo").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  supplierFk: foreignKey({
    columns: [table.supplierId],
    foreignColumns: [suppliers.id],
  }),
}));

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

// Estoque de Consumíveis - Tabela Base
export const consumables = mysqlTable("consumables", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  minStock: int("minStock").notNull().default(0),
  maxStock: int("maxStock").notNull().default(0),
  currentStock: int("currentStock").notNull().default(0),
  replenishStock: int("replenishStock").notNull().default(0),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consumable = typeof consumables.$inferSelect;
export type InsertConsumable = typeof consumables.$inferInsert;

// Estoque de Consumíveis - Histórico Semanal
export const consumablesWeekly = mysqlTable("consumables_weekly", {
  id: int("id").autoincrement().primaryKey(),
  consumableId: int("consumableId").notNull(),
  weekStartDate: datetime("weekStartDate").notNull(),
  minStock: int("minStock").notNull(),
  maxStock: int("maxStock").notNull(),
  currentStock: int("currentStock").notNull(),
  replenishStock: int("replenishStock").notNull(),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  consumableFk: foreignKey({
    columns: [table.consumableId],
    foreignColumns: [consumables.id],
  }),
}));

export type ConsumableWeekly = typeof consumablesWeekly.$inferSelect;
export type InsertConsumableWeekly = typeof consumablesWeekly.$inferInsert;

// Estoque de Consumíveis - Histórico Mensal
export const consumablesMonthly = mysqlTable("consumables_monthly", {
  id: int("id").autoincrement().primaryKey(),
  consumableId: int("consumableId").notNull(),
  monthStartDate: datetime("monthStartDate").notNull(),
  minStock: int("minStock").notNull(),
  maxStock: int("maxStock").notNull(),
  currentStock: int("currentStock").notNull(),
  replenishStock: int("replenishStock").notNull(),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  consumableFk: foreignKey({
    columns: [table.consumableId],
    foreignColumns: [consumables.id],
  }),
}));

export type ConsumableMonthly = typeof consumablesMonthly.$inferSelect;
export type InsertConsumableMonthly = typeof consumablesMonthly.$inferInsert;

// Unidades/Spaces para Consumíveis
export const consumableSpaces = mysqlTable("consumable_spaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConsumableSpace = typeof consumableSpaces.$inferSelect;
export type InsertConsumableSpace = typeof consumableSpaces.$inferInsert;

// Atualizar consumables para incluir spaceId
export const consumablesWithSpace = mysqlTable("consumables_with_space", {
  id: int("id").autoincrement().primaryKey(),
  spaceId: int("spaceId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  minStock: int("minStock").notNull().default(0),
  maxStock: int("maxStock").notNull().default(0),
  currentStock: int("currentStock").notNull().default(0),
  replenishStock: int("replenishStock").notNull().default(0),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  spaceFk: foreignKey({
    columns: [table.spaceId],
    foreignColumns: [consumableSpaces.id],
  }),
}));

export type ConsumableWithSpace = typeof consumablesWithSpace.$inferSelect;
export type InsertConsumableWithSpace = typeof consumablesWithSpace.$inferInsert;

// Tabelas Semanais de Consumíveis
export const consumableWeeklyMovements = mysqlTable("consumable_weekly_movements", {
  id: int("id").autoincrement().primaryKey(),
  consumableId: int("consumableId").notNull(),
  spaceId: int("spaceId").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  weekNumber: int("weekNumber").notNull(),
  year: int("year").notNull(),
  mondayStock: int("mondayStock").notNull().default(0),
  tuesdayStock: int("tuesdayStock").notNull().default(0),
  wednesdayStock: int("wednesdayStock").notNull().default(0),
  thursdayStock: int("thursdayStock").notNull().default(0),
  fridayStock: int("fridayStock").notNull().default(0),
  saturdayStock: int("saturdayStock").notNull().default(0),
  sundayStock: int("sundayStock").notNull().default(0),
  totalMovement: int("totalMovement").notNull().default(0),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  consumableFk: foreignKey({
    columns: [table.consumableId],
    foreignColumns: [consumablesWithSpace.id],
  }),
  spaceFk: foreignKey({
    columns: [table.spaceId],
    foreignColumns: [consumableSpaces.id],
  }),
}));

export type ConsumableWeeklyMovement = typeof consumableWeeklyMovements.$inferSelect;
export type InsertConsumableWeeklyMovement = typeof consumableWeeklyMovements.$inferInsert;

// Tabelas Mensais de Consumíveis (agregação de semanais)
export const consumableMonthlyMovements = mysqlTable("consumable_monthly_movements", {
  id: int("id").autoincrement().primaryKey(),
  consumableId: int("consumableId").notNull(),
  spaceId: int("spaceId").notNull(),
  monthStartDate: date("monthStartDate").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  week1Stock: int("week1Stock").notNull().default(0),
  week2Stock: int("week2Stock").notNull().default(0),
  week3Stock: int("week3Stock").notNull().default(0),
  week4Stock: int("week4Stock").notNull().default(0),
  week5Stock: int("week5Stock").notNull().default(0),
  totalMovement: int("totalMovement").notNull().default(0),
  averageStock: int("averageStock").notNull().default(0),
  status: mysqlEnum("status", ["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  consumableFk: foreignKey({
    columns: [table.consumableId],
    foreignColumns: [consumablesWithSpace.id],
  }),
  spaceFk: foreignKey({
    columns: [table.spaceId],
    foreignColumns: [consumableSpaces.id],
  }),
}));

export type ConsumableMonthlyMovement = typeof consumableMonthlyMovements.$inferSelect;
export type InsertConsumableMonthlyMovement = typeof consumableMonthlyMovements.$inferInsert;


// Histórico de Alterações de Estoque
export const consumableStockAuditLog = mysqlTable("consumable_stock_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  consumableWeeklyMovementId: int("consumableWeeklyMovementId").notNull(),
  consumableId: int("consumableId").notNull(),
  spaceId: int("spaceId").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  userId: int("userId").notNull(),
  previousValue: int("previousValue").notNull(),
  newValue: int("newValue").notNull(),
  fieldName: varchar("fieldName", { length: 50 }).notNull(), // "totalMovement", "mondayStock", etc
  changeReason: text("changeReason"), // Motivo da alteração (opcional)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  consumableWeeklyMovementFk: foreignKey({
    columns: [table.consumableWeeklyMovementId],
    foreignColumns: [consumableWeeklyMovements.id],
  }),
  consumableFk: foreignKey({
    columns: [table.consumableId],
    foreignColumns: [consumablesWithSpace.id],
  }),
  spaceFk: foreignKey({
    columns: [table.spaceId],
    foreignColumns: [consumableSpaces.id],
  }),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
}));

export type ConsumableStockAuditLog = typeof consumableStockAuditLog.$inferSelect;
export type InsertConsumableStockAuditLog = typeof consumableStockAuditLog.$inferInsert;
