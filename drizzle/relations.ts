import { relations } from "drizzle-orm/relations";
import { consumables, consumablesMonthly, consumablesWeekly, consumableSpaces, consumablesWithSpace, contracts, contractAlerts, contractsWithSpace, contractSpaces, inventory, inventoryMovements, users, teams, maintenanceRequests, rooms, roomReservations, schedules, suppliersWithSpace } from "./schema";

export const consumablesMonthlyRelations = relations(consumablesMonthly, ({one}) => ({
	consumable: one(consumables, {
		fields: [consumablesMonthly.consumableId],
		references: [consumables.id]
	}),
}));

export const consumablesRelations = relations(consumables, ({many}) => ({
	consumablesMonthlies: many(consumablesMonthly),
	consumablesWeeklies: many(consumablesWeekly),
}));

export const consumablesWeeklyRelations = relations(consumablesWeekly, ({one}) => ({
	consumable: one(consumables, {
		fields: [consumablesWeekly.consumableId],
		references: [consumables.id]
	}),
}));

export const consumablesWithSpaceRelations = relations(consumablesWithSpace, ({one}) => ({
	consumableSpace: one(consumableSpaces, {
		fields: [consumablesWithSpace.spaceId],
		references: [consumableSpaces.id]
	}),
}));

export const consumableSpacesRelations = relations(consumableSpaces, ({many}) => ({
	consumablesWithSpaces: many(consumablesWithSpace),
	contractAlerts: many(contractAlerts),
	contractsWithSpaces: many(contractsWithSpace),
	suppliersWithSpaces: many(suppliersWithSpace),
}));

export const contractAlertsRelations = relations(contractAlerts, ({one}) => ({
	contract: one(contracts, {
		fields: [contractAlerts.contractId],
		references: [contracts.id]
	}),
	consumableSpace: one(consumableSpaces, {
		fields: [contractAlerts.spaceId],
		references: [consumableSpaces.id]
	}),
}));

export const contractsRelations = relations(contracts, ({many}) => ({
	contractAlerts: many(contractAlerts),
	contractsWithSpaces: many(contractsWithSpace),
}));

export const contractsWithSpaceRelations = relations(contractsWithSpace, ({one}) => ({
	consumableSpace: one(consumableSpaces, {
		fields: [contractsWithSpace.spaceId],
		references: [consumableSpaces.id]
	}),
	contract: one(contracts, {
		fields: [contractsWithSpace.contractId],
		references: [contracts.id]
	}),
	contractSpace: one(contractSpaces, {
		fields: [contractsWithSpace.spaceId],
		references: [contractSpaces.id]
	}),
}));

export const contractSpacesRelations = relations(contractSpaces, ({many}) => ({
	contractsWithSpaces: many(contractsWithSpace),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	inventory: one(inventory, {
		fields: [inventoryMovements.inventoryId],
		references: [inventory.id]
	}),
	user: one(users, {
		fields: [inventoryMovements.userId],
		references: [users.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({many}) => ({
	inventoryMovements: many(inventoryMovements),
}));

export const usersRelations = relations(users, ({many}) => ({
	inventoryMovements: many(inventoryMovements),
	maintenanceRequests: many(maintenanceRequests),
	roomReservations: many(roomReservations),
}));

export const maintenanceRequestsRelations = relations(maintenanceRequests, ({one}) => ({
	team: one(teams, {
		fields: [maintenanceRequests.assignedTo],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [maintenanceRequests.createdBy],
		references: [users.id]
	}),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	maintenanceRequests: many(maintenanceRequests),
	schedules: many(schedules),
}));

export const roomReservationsRelations = relations(roomReservations, ({one}) => ({
	room: one(rooms, {
		fields: [roomReservations.roomId],
		references: [rooms.id]
	}),
	user: one(users, {
		fields: [roomReservations.userId],
		references: [users.id]
	}),
}));

export const roomsRelations = relations(rooms, ({many}) => ({
	roomReservations: many(roomReservations),
}));

export const schedulesRelations = relations(schedules, ({one}) => ({
	team: one(teams, {
		fields: [schedules.teamId],
		references: [teams.id]
	}),
}));

export const suppliersWithSpaceRelations = relations(suppliersWithSpace, ({one}) => ({
	consumableSpace: one(consumableSpaces, {
		fields: [suppliersWithSpace.spaceId],
		references: [consumableSpaces.id]
	}),
}));