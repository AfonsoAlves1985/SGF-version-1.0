import { pgTable, pgEnum, serial, integer, varchar, text, timestamp, date, decimal, json, index, boolean, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const stockStatusEnum = pgEnum('stock_status', ['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE'])
export const contractStatusEnum = pgEnum('contract_status', ['ativo','inativo','vencido'])
export const contractTypeEnum = pgEnum('contract_type', ['mensal','anual'])
export const contractAlertTypeEnum = pgEnum('contract_alert_type', ['monthly_payment','contract_expiry'])
export const inventoryStatusEnum = pgEnum('inventory_status', ['ativo','inativo','descontinuado'])
export const movementTypeEnum = pgEnum('movement_type', ['entrada','saida'])
export const maintenancePriorityEnum = pgEnum('maintenance_priority', ['baixa','media','alta','urgente'])
export const maintenanceTypeEnum = pgEnum('maintenance_type', ['preventiva','correctiva'])
export const maintenanceStatusEnum = pgEnum('maintenance_status', ['aberto','em_progresso','concluido','cancelado'])
export const roomReservationStatusEnum = pgEnum('room_reservation_status', ['confirmada','pendente','cancelada'])
export const roomTypeEnum = pgEnum('room_type', ['sala','auditorio','cozinha','outro'])
export const roomStatusEnum = pgEnum('room_status', ['disponivel','ocupada','manutencao'])
export const scheduleStatusEnum = pgEnum('schedule_status', ['confirmada','pendente','cancelada'])
export const shiftEnum = pgEnum('shift', ['manha','tarde','noite'])
export const supplierStatusEnum = pgEnum('supplier_status', ['ativo','inativo','suspenso'])
export const teamRoleEnum = pgEnum('team_role', ['limpeza','manutencao','admin'])
export const teamStatusEnum = pgEnum('team_status', ['ativo','inativo'])
export const userRoleEnum = pgEnum('user_role', ['superadmin','admin','editor','viewer','user'])
export const auditActionEnum = pgEnum('audit_action', ['create','read','update','delete','login','logout'])
export const auditStatusEnum = pgEnum('audit_status', ['success','failed'])

export const consumableMonthlyMovements = pgTable("consumable_monthly_movements", {
	id: serial().primaryKey(),
	consumableId: integer().notNull(),
	spaceId: integer().notNull(),
	monthStartDate: varchar({ length: 10 }).notNull(),
	month: integer().notNull(),
	year: integer().notNull(),
	week1Stock: integer().default(0).notNull(),
	week2Stock: integer().default(0).notNull(),
	week3Stock: integer().default(0).notNull(),
	week4Stock: integer().default(0).notNull(),
	week5Stock: integer().default(0).notNull(),
	totalMovement: integer().default(0).notNull(),
	averageStock: integer().default(0).notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumableSpaces = pgTable("consumable_spaces", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumableStockAuditLog = pgTable("consumable_stock_audit_log", {
	id: serial().primaryKey(),
	consumableWeeklyMovementId: integer().notNull(),
	consumableId: integer().notNull(),
	spaceId: integer().notNull(),
	weekStartDate: varchar({ length: 10 }).notNull(),
	userId: integer().notNull(),
	previousValue: integer().notNull(),
	newValue: integer().notNull(),
	fieldName: varchar({ length: 50 }).notNull(),
	changeReason: text(),
	createdAt: timestamp().defaultNow().notNull(),
});

export const consumableWeeklyMovements = pgTable("consumable_weekly_movements", {
	id: serial().primaryKey(),
	consumableId: integer().notNull(),
	spaceId: integer().notNull(),
	weekStartDate: varchar({ length: 10 }).notNull(),
	weekNumber: integer().notNull(),
	year: integer().notNull(),
	mondayStock: integer().default(0).notNull(),
	tuesdayStock: integer().default(0).notNull(),
	wednesdayStock: integer().default(0).notNull(),
	thursdayStock: integer().default(0).notNull(),
	fridayStock: integer().default(0).notNull(),
	saturdayStock: integer().default(0).notNull(),
	sundayStock: integer().default(0).notNull(),
	totalMovement: integer().default(0).notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumables = pgTable("consumables", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	minStock: integer().default(0).notNull(),
	maxStock: integer().default(0).notNull(),
	currentStock: integer().default(0).notNull(),
	replenishStock: integer().default(0).notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumablesMonthly = pgTable("consumables_monthly", {
	id: serial().primaryKey(),
	consumableId: integer().references(() => consumables.id),
	monthStartDate: varchar({ length: 25 }).notNull(),
	minStock: integer().notNull(),
	maxStock: integer().notNull(),
	currentStock: integer().notNull(),
	replenishStock: integer().notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumablesWeekly = pgTable("consumables_weekly", {
	id: serial().primaryKey(),
	consumableId: integer().references(() => consumables.id),
	weekStartDate: varchar({ length: 25 }).notNull(),
	minStock: integer().notNull(),
	maxStock: integer().notNull(),
	currentStock: integer().notNull(),
	replenishStock: integer().notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const consumablesWithSpace = pgTable("consumables_with_space", {
	id: serial().primaryKey(),
	spaceId: integer().references(() => consumableSpaces.id),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	minStock: integer().default(0).notNull(),
	maxStock: integer().default(0).notNull(),
	currentStock: integer().default(0).notNull(),
	replenishStock: integer().default(0).notNull(),
	status: stockStatusEnum().default('ESTOQUE_OK').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const contractAlerts = pgTable("contract_alerts", {
	id: serial().primaryKey(),
	contractId: integer().references(() => contracts.id),
	spaceId: integer().references(() => consumableSpaces.id),
	alertType: contractAlertTypeEnum().notNull(),
	daysUntilEvent: integer().notNull(),
	isResolved: boolean().default(false).notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	resolvedAt: timestamp(),
});

export const contractSpaces = pgTable("contract_spaces", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
	id: serial().primaryKey(),
	companyName: varchar({ length: 255 }).notNull(),
	cnpj: varchar({ length: 18 }),
	description: text().notNull(),
	contact: varchar({ length: 255 }),
	contractType: contractTypeEnum().notNull(),
	signatureDate: varchar({ length: 10 }).notNull(),
	endDate: varchar({ length: 25 }).notNull(),
	monthlyPaymentDate: integer(),
	isRenewable: boolean().default(false).notNull(),
	documentUrl: text(),
	value: decimal({ precision: 10, scale: 2 }),
	status: contractStatusEnum().default('ativo').notNull(),
	notes: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp(),
});

export const contractsWithSpace = pgTable("contracts_with_space", {
	id: serial().primaryKey(),
	spaceId: integer().references(() => contractSpaces.id),
	contractId: integer().references(() => contracts.id),
	createdAt: timestamp().defaultNow().notNull(),
},
(table) => [
	index("fk_1").on(table.spaceId),
]);

export const inventory = pgTable("inventory", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	quantity: integer().default(0).notNull(),
	minQuantity: integer().default(5).notNull(),
	unit: varchar({ length: 50 }).default('unidade').notNull(),
	location: varchar({ length: 255 }).notNull(),
	status: inventoryStatusEnum().default('ativo').notNull(),
	lastUpdated: timestamp().defaultNow().notNull(),
	createdAt: timestamp().defaultNow().notNull(),
});

export const inventoryMovements = pgTable("inventory_movements", {
	id: serial().primaryKey(),
	inventoryId: integer().references(() => inventory.id),
	type: movementTypeEnum().notNull(),
	quantity: integer().notNull(),
	reason: varchar({ length: 255 }),
	userId: integer().references(() => users.id),
	createdAt: timestamp().defaultNow().notNull(),
});

export const maintenanceRequests = pgTable("maintenance_requests", {
	id: serial().primaryKey(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	department: varchar({ length: 120 }),
	requestDate: varchar({ length: 10 }),
	priority: maintenancePriorityEnum().default('media').notNull(),
	type: maintenanceTypeEnum().notNull(),
	status: maintenanceStatusEnum().default('aberto').notNull(),
	assignedTo: integer().references(() => teams.id),
	createdBy: integer().references(() => users.id),
	completedAt: varchar({ length: 25 }),
	notes: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
	spaceId: integer().default(1).notNull().references(() => maintenanceSpaces.id, { onDelete: 'cascade' }),
});

export const maintenanceSpaces = pgTable("maintenance_spaces", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const roomReservations = pgTable("room_reservations", {
	id: serial().primaryKey(),
	roomId: integer().references(() => rooms.id),
	userId: integer().references(() => users.id),
	startTime: varchar({ length: 25 }).notNull(),
	endTime: varchar({ length: 25 }).notNull(),
	purpose: varchar({ length: 255 }),
	status: roomReservationStatusEnum().default('confirmada').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	capacity: integer().notNull(),
	location: varchar({ length: 255 }).notNull(),
	type: roomTypeEnum().notNull(),
	status: roomStatusEnum().default('disponivel').notNull(),
	responsibleUserName: varchar({ length: 255 }),
	startDate: varchar({ length: 10 }),
	endDate: varchar({ length: 10 }),
	startTime: varchar({ length: 5 }),
	endTime: varchar({ length: 5 }),
	isReleased: boolean().default(false).notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
	id: serial().primaryKey(),
	teamId: integer().references(() => teams.id),
	date: varchar({ length: 25 }).notNull(),
	shift: shiftEnum().notNull(),
	sector: varchar({ length: 100 }),
	status: scheduleStatusEnum().default('confirmada').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
});

export const supplierSpaces = pgTable("supplier_spaces", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
	id: serial().primaryKey(),
	status: supplierStatusEnum().default('ativo').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	serviceTypes: json().notNull(),
	contact: varchar({ length: 255 }).notNull(),
	contactPerson: varchar({ length: 255 }).notNull(),
	notes: text(),
	updatedAt: timestamp().defaultNow().notNull(),
});

export const suppliersWithSpace = pgTable("suppliers_with_space", {
	id: serial().primaryKey(),
	spaceId: integer().references(() => supplierSpaces.id, { onDelete: 'cascade' }),
	companyName: varchar({ length: 255 }).notNull(),
	serviceTypes: json().notNull(),
	contact: varchar({ length: 255 }).notNull(),
	contactPerson: varchar({ length: 255 }).notNull(),
	status: supplierStatusEnum().default('ativo').notNull(),
	notes: text(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
},
(table) => [
	index("suppliers_with_space_spaceId_consumable_spaces_id_fk").on(table.spaceId),
]);

export const teams = pgTable("teams", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 20 }),
	role: teamRoleEnum().notNull(),
	sector: varchar({ length: 100 }),
	status: teamStatusEnum().default('ativo').notNull(),
	createdAt: timestamp().defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	password: varchar({ length: 255 }),
	role: userRoleEnum().default('viewer').notNull(),
	isActive: boolean().default(true).notNull(),
	lastLogin: timestamp(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
	lastSignedIn: timestamp().defaultNow().notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);

export const auditLog = pgTable("audit_log", {
	id: serial().primaryKey(),
	userId: integer().references(() => users.id),
	action: auditActionEnum().notNull(),
	module: varchar({ length: 100 }).notNull(),
	recordId: integer(),
	recordName: varchar({ length: 255 }),
	changes: json(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	status: auditStatusEnum().default('success').notNull(),
	errorMessage: text(),
	createdAt: timestamp().defaultNow().notNull(),
},
(table) => [
	index("audit_log_userId").on(table.userId),
	index("audit_log_module").on(table.module),
	index("audit_log_createdAt").on(table.createdAt),
]);

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertInventory = typeof inventory.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;

export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;

export type InsertTeam = typeof teams.$inferInsert;
export type Team = typeof teams.$inferSelect;

export type InsertRoom = typeof rooms.$inferInsert;
export type Room = typeof rooms.$inferSelect;

export type InsertRoomReservation = typeof roomReservations.$inferInsert;
export type RoomReservation = typeof roomReservations.$inferSelect;

export type InsertMaintenanceRequest = typeof maintenanceRequests.$inferInsert;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;

export type InsertSupplier = typeof suppliers.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertSupplierWithSpace = typeof suppliersWithSpace.$inferInsert;
export type SupplierWithSpace = typeof suppliersWithSpace.$inferSelect;

export type InsertSupplierSpace = typeof supplierSpaces.$inferInsert;
export type SupplierSpace = typeof supplierSpaces.$inferSelect;

export type InsertConsumable = typeof consumables.$inferInsert;
export type Consumable = typeof consumables.$inferSelect;

export type InsertConsumableWeekly = typeof consumablesWeekly.$inferInsert;
export type ConsumableWeekly = typeof consumablesWeekly.$inferSelect;

export type InsertConsumableMonthly = typeof consumablesMonthly.$inferInsert;
export type ConsumableMonthly = typeof consumablesMonthly.$inferSelect;

export type InsertConsumableSpace = typeof consumableSpaces.$inferInsert;
export type ConsumableSpace = typeof consumableSpaces.$inferSelect;

export type InsertConsumableWithSpace = typeof consumablesWithSpace.$inferInsert;
export type ConsumableWithSpace = typeof consumablesWithSpace.$inferSelect;

export type InsertConsumableWeeklyMovement = typeof consumableWeeklyMovements.$inferInsert;
export type ConsumableWeeklyMovement = typeof consumableWeeklyMovements.$inferSelect;

export type InsertConsumableMonthlyMovement = typeof consumableMonthlyMovements.$inferInsert;
export type ConsumableMonthlyMovement = typeof consumableMonthlyMovements.$inferSelect;

export type InsertConsumableStockAuditLog = typeof consumableStockAuditLog.$inferInsert;
export type ConsumableStockAuditLog = typeof consumableStockAuditLog.$inferSelect;

export type InsertContract = typeof contracts.$inferInsert;
export type Contract = typeof contracts.$inferSelect;

export type InsertContractWithSpace = typeof contractsWithSpace.$inferInsert;
export type ContractWithSpace = typeof contractsWithSpace.$inferSelect;

export type InsertContractAlert = typeof contractAlerts.$inferInsert;
export type ContractAlert = typeof contractAlerts.$inferSelect;

export type InsertContractSpace = typeof contractSpaces.$inferInsert;
export type ContractSpace = typeof contractSpaces.$inferSelect;
