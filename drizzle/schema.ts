import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, datetime, foreignKey } from "drizzle-orm/mysql-core";

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
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

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