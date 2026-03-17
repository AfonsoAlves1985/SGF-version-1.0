import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ INVENTÁRIO ============
  inventory: router({
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listInventory(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getInventoryById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.string(),
        quantity: z.number().default(0),
        minQuantity: z.number().default(5),
        unit: z.string().default("unidade"),
        location: z.string(),
      }))
      .mutation(async ({ input }) => {
        return db.createInventory(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        quantity: z.number().optional(),
        minQuantity: z.number().optional(),
        unit: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(["ativo", "inativo", "descontinuado"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateInventory(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteInventory(input);
      }),

    addMovement: protectedProcedure
      .input(z.object({
        inventoryId: z.number(),
        type: z.enum(["entrada", "saida"]),
        quantity: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.addInventoryMovement({
          ...input,
          userId: ctx.user.id,
        });
      }),

    getMovements: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getInventoryMovements(input);
      }),

    getAllMovements: protectedProcedure
      .query(async () => {
        return db.getAllInventoryMovements();
      }),
  }),

  // ============ EQUIPA ============
  teams: router({
    list: protectedProcedure
      .input(z.object({
        role: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listTeams(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getTeamById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["limpeza", "manutencao", "admin"]),
        sector: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createTeam(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["limpeza", "manutencao", "admin"]).optional(),
        sector: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateTeam(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteTeam(input);
      }),
  }),

  // ============ ESCALA ============
  schedules: router({
    list: protectedProcedure
      .input(z.object({
        teamId: z.number().optional(),
        date: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listSchedules(input);
      }),

    create: protectedProcedure
      .input(z.object({
        teamId: z.number(),
        date: z.date(),
        shift: z.enum(["manha", "tarde", "noite"]),
        sector: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSchedule({
          ...input,
          date: new Date(input.date),
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        teamId: z.number().optional(),
        date: z.date().optional(),
        shift: z.enum(["manha", "tarde", "noite"]).optional(),
        sector: z.string().optional(),
        status: z.enum(["confirmada", "pendente", "cancelada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSchedule(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteSchedule(input);
      }),
  }),

  // ============ SALAS ============
  rooms: router({
    list: protectedProcedure
      .input(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listRooms(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getRoomById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        capacity: z.number(),
        location: z.string(),
        type: z.enum(["sala", "auditorio", "cozinha", "outro"]),
      }))
      .mutation(async ({ input }) => {
        return db.createRoom(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        capacity: z.number().optional(),
        location: z.string().optional(),
        type: z.enum(["sala", "auditorio", "cozinha", "outro"]).optional(),
        status: z.enum(["disponivel", "ocupada", "manutencao"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoom(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteRoom(input);
      }),
  }),

  // ============ RESERVAS DE SALAS ============
  roomReservations: router({
    list: protectedProcedure
      .input(z.object({
        roomId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listRoomReservations(input);
      }),

    create: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        purpose: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createRoomReservation({
          ...input,
          userId: ctx.user.id,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        roomId: z.number().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        purpose: z.string().optional(),
        status: z.enum(["confirmada", "pendente", "cancelada"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoomReservation(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteRoomReservation(input);
      }),
  }),

  // ============ MANUTENÇÃO ============
  maintenance: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedTo: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listMaintenanceRequests(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getMaintenanceRequestById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
        type: z.enum(["preventiva", "correctiva"]),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createMaintenanceRequest({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
        type: z.enum(["preventiva", "correctiva"]).optional(),
        status: z.enum(["aberto", "em_progresso", "concluido", "cancelado"]).optional(),
        assignedTo: z.number().optional(),
        notes: z.string().optional(),
        completedAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMaintenanceRequest(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteMaintenanceRequest(input);
      }),
  }),

  // ============ FORNECEDORES ============
  suppliers: router({
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listSuppliers(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getSupplierById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplier(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        category: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplier(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteSupplier(input);
      }),
  }),

  // ============ CONTRATOS ============
  contracts: router({
    list: protectedProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listContracts(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getContractById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        supplierId: z.number(),
        title: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        value: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createContract({
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        supplierId: z.number().optional(),
        title: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        value: z.string().optional(),
        status: z.enum(["ativo", "expirado", "cancelado"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateContract(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteContract(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
