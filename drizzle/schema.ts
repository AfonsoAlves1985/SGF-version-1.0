import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, date, mysqlEnum, timestamp, varchar, text, foreignKey, datetime, decimal, index, json } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const consumableMonthlyMovements = mysqlTable("consumable_monthly_movements", {
	id: int().autoincrement().notNull(),
	consumableId: int().notNull(),
	spaceId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	monthStartDate: date({ mode: 'string' }).notNull(),
	month: int().notNull(),
	year: int().notNull(),
	week1Stock: int().default(0).notNull(),
	week2Stock: int().default(0).notNull(),
	week3Stock: int().default(0).notNull(),
	week4Stock: int().default(0).notNull(),
	week5Stock: int().default(0).notNull(),
	totalMovement: int().default(0).notNull(),
	averageStock: int().default(0).notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumableSpaces = mysqlTable("consumable_spaces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumableStockAuditLog = mysqlTable("consumable_stock_audit_log", {
	id: int().autoincrement().notNull(),
	consumableWeeklyMovementId: int().notNull(),
	consumableId: int().notNull(),
	spaceId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	weekStartDate: date({ mode: 'string' }).notNull(),
	userId: int().notNull(),
	previousValue: int().notNull(),
	newValue: int().notNull(),
	fieldName: varchar({ length: 50 }).notNull(),
	changeReason: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const consumableWeeklyMovements = mysqlTable("consumable_weekly_movements", {
	id: int().autoincrement().notNull(),
	consumableId: int().notNull(),
	spaceId: int().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	weekStartDate: date({ mode: 'string' }).notNull(),
	weekNumber: int().notNull(),
	year: int().notNull(),
	mondayStock: int().default(0).notNull(),
	tuesdayStock: int().default(0).notNull(),
	wednesdayStock: int().default(0).notNull(),
	thursdayStock: int().default(0).notNull(),
	fridayStock: int().default(0).notNull(),
	saturdayStock: int().default(0).notNull(),
	sundayStock: int().default(0).notNull(),
	totalMovement: int().default(0).notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumables = mysqlTable("consumables", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	minStock: int().default(0).notNull(),
	maxStock: int().default(0).notNull(),
	currentStock: int().default(0).notNull(),
	replenishStock: int().default(0).notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumablesMonthly = mysqlTable("consumables_monthly", {
	id: int().autoincrement().notNull(),
	consumableId: int().notNull().references(() => consumables.id),
	monthStartDate: datetime({ mode: 'string'}).notNull(),
	minStock: int().notNull(),
	maxStock: int().notNull(),
	currentStock: int().notNull(),
	replenishStock: int().notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumablesWeekly = mysqlTable("consumables_weekly", {
	id: int().autoincrement().notNull(),
	consumableId: int().notNull().references(() => consumables.id),
	weekStartDate: datetime({ mode: 'string'}).notNull(),
	minStock: int().notNull(),
	maxStock: int().notNull(),
	currentStock: int().notNull(),
	replenishStock: int().notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const consumablesWithSpace = mysqlTable("consumables_with_space", {
	id: int().autoincrement().notNull(),
	spaceId: int().notNull().references(() => consumableSpaces.id),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	unit: varchar({ length: 50 }).notNull(),
	minStock: int().default(0).notNull(),
	maxStock: int().default(0).notNull(),
	currentStock: int().default(0).notNull(),
	replenishStock: int().default(0).notNull(),
	status: mysqlEnum(['ESTOQUE_OK','ACIMA_DO_ESTOQUE','REPOR_ESTOQUE']).default('ESTOQUE_OK').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const contractAlerts = mysqlTable("contract_alerts", {
	id: int().autoincrement().notNull(),
	contractId: int().notNull().references(() => contracts.id),
	spaceId: int().notNull().references(() => consumableSpaces.id),
	alertType: mysqlEnum(['monthly_payment','contract_expiry']).notNull(),
	daysUntilEvent: int().notNull(),
	isResolved: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
});

export const contractSpaces = mysqlTable("contract_spaces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const contracts = mysqlTable("contracts", {
	id: int().autoincrement().notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	contractType: mysqlEnum(['mensal','anual']).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	signatureDate: date({ mode: 'string' }).notNull(),
	endDate: datetime({ mode: 'string'}).notNull(),
	monthlyPaymentDate: int(),
	documentUrl: text(),
	value: decimal({ precision: 10, scale: 2 }),
	status: mysqlEnum(['ativo','inativo','vencido']).default('ativo').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const contractsWithSpace = mysqlTable("contracts_with_space", {
	id: int().autoincrement().notNull(),
	spaceId: int().notNull().references(() => contractSpaces.id),
	contractId: int().notNull().references(() => contracts.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("fk_1").on(table.spaceId),
]);

export const inventory = mysqlTable("inventory", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: varchar({ length: 100 }).notNull(),
	quantity: int().default(0).notNull(),
	minQuantity: int().default(5).notNull(),
	unit: varchar({ length: 50 }).default('unidade').notNull(),
	location: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['ativo','inativo','descontinuado']).default('ativo').notNull(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const inventoryMovements = mysqlTable("inventory_movements", {
	id: int().autoincrement().notNull(),
	inventoryId: int().notNull().references(() => inventory.id),
	type: mysqlEnum(['entrada','saida']).notNull(),
	quantity: int().notNull(),
	reason: varchar({ length: 255 }),
	userId: int().notNull().references(() => users.id),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const maintenanceRequests = mysqlTable("maintenance_requests", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: mysqlEnum(['baixa','media','alta','urgente']).default('media').notNull(),
	type: mysqlEnum(['preventiva','correctiva']).notNull(),
	status: mysqlEnum(['aberto','em_progresso','concluido','cancelado']).default('aberto').notNull(),
	assignedTo: int().references(() => teams.id),
	createdBy: int().notNull().references(() => users.id),
	completedAt: datetime({ mode: 'string'}),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	spaceId: int().default(1).notNull().references(() => maintenanceSpaces.id, { onDelete: "cascade" } ),
});

export const maintenanceSpaces = mysqlTable("maintenance_spaces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const roomReservations = mysqlTable("room_reservations", {
	id: int().autoincrement().notNull(),
	roomId: int().notNull().references(() => rooms.id),
	userId: int().notNull().references(() => users.id),
	startTime: datetime({ mode: 'string'}).notNull(),
	endTime: datetime({ mode: 'string'}).notNull(),
	purpose: varchar({ length: 255 }),
	status: mysqlEnum(['confirmada','pendente','cancelada']).default('confirmada').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const rooms = mysqlTable("rooms", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	capacity: int().notNull(),
	location: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['sala','auditorio','cozinha','outro']).notNull(),
	status: mysqlEnum(['disponivel','ocupada','manutencao']).default('disponivel').notNull(),
	responsibleUserId: int().references(() => users.id),
	responsibleUserName: varchar({ length: 255 }),
	startDate: datetime({ mode: 'date' }),
	endDate: datetime({ mode: 'date' }),
	startTime: varchar({ length: 5 }),
	endTime: varchar({ length: 5 }),
	isReleased: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const schedules = mysqlTable("schedules", {
	id: int().autoincrement().notNull(),
	teamId: int().notNull().references(() => teams.id),
	date: datetime({ mode: 'string'}).notNull(),
	shift: mysqlEnum(['manha','tarde','noite']).notNull(),
	sector: varchar({ length: 100 }),
	status: mysqlEnum(['confirmada','pendente','cancelada']).default('confirmada').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const supplierSpaces = mysqlTable("supplier_spaces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const suppliers = mysqlTable("suppliers", {
	id: int().autoincrement().notNull(),
	status: mysqlEnum(['ativo','inativo','suspenso']).default('ativo').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	companyName: varchar({ length: 255 }).notNull(),
	serviceTypes: json().notNull(),
	contact: varchar({ length: 255 }).notNull(),
	contactPerson: varchar({ length: 255 }).notNull(),
	notes: text(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const suppliersWithSpace = mysqlTable("suppliers_with_space", {
	id: int().autoincrement().notNull(),
	spaceId: int().notNull().references(() => supplierSpaces.id, { onDelete: "cascade" } ),
	companyName: varchar({ length: 255 }).notNull(),
	serviceTypes: json().notNull(),
	contact: varchar({ length: 255 }).notNull(),
	contactPerson: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['ativo','inativo','suspenso']).default('ativo').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("suppliers_with_space_spaceId_consumable_spaces_id_fk").on(table.spaceId),
]);

export const teams = mysqlTable("teams", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 20 }),
	role: mysqlEnum(['limpeza','manutencao','admin']).notNull(),
	sector: varchar({ length: 100 }),
	status: mysqlEnum(['ativo','inativo']).default('ativo').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
]);
