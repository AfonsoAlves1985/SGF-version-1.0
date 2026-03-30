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
        companyName: z.string(),
        serviceTypes: z.array(z.string()),
        contact: z.string(),
        contactPerson: z.string(),
        status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplier(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().optional(),
        serviceTypes: z.array(z.string()).optional(),
        contact: z.string().optional(),
        contactPerson: z.string().optional(),
        status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
        notes: z.string().optional(),
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

  // Fornecedores por Espaço
  suppliersWithSpace: router({
    list: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listSuppliersWithSpace(input?.spaceId);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getSupplierWithSpaceById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        spaceId: z.number(),
        companyName: z.string(),
        serviceTypes: z.array(z.string()),
        contact: z.string(),
        contactPerson: z.string(),
        status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplierWithSpace(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().optional(),
        serviceTypes: z.array(z.string()).optional(),
        contact: z.string().optional(),
        contactPerson: z.string().optional(),
        status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplierWithSpace(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteSupplierWithSpace(input);
      }),
  }),



  // ============ CONSUMÍVEIS ============
  consumables: router({
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listConsumables(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getConsumableById(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.string(),
        unit: z.string(),
        minStock: z.number().default(0),
        maxStock: z.number().default(0),
        currentStock: z.number().default(0),
        replenishStock: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumable(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        minStock: z.number().optional(),
        maxStock: z.number().optional(),
        currentStock: z.number().optional(),
        replenishStock: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumable(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteConsumable(input);
      }),

    listWeekly: protectedProcedure
      .input(z.object({
        consumableId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listConsumablesWeekly(input);
      }),

    createWeekly: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        weekStartDate: z.date(),
        minStock: z.number(),
        maxStock: z.number(),
        currentStock: z.number(),
        replenishStock: z.number(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK"),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableWeekly(input);
      }),

    updateWeekly: protectedProcedure
      .input(z.object({
        id: z.number(),
        minStock: z.number().optional(),
        maxStock: z.number().optional(),
        currentStock: z.number().optional(),
        replenishStock: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWeekly(id, data);
      }),

    listMonthly: protectedProcedure
      .input(z.object({
        consumableId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listConsumablesMonthly(input);
      }),

    createMonthly: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        monthStartDate: z.date(),
        minStock: z.number(),
        maxStock: z.number(),
        currentStock: z.number(),
        replenishStock: z.number(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK"),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableMonthly(input);
      }),

    updateMonthly: protectedProcedure
      .input(z.object({
        id: z.number(),
        minStock: z.number().optional(),
        maxStock: z.number().optional(),
        currentStock: z.number().optional(),
        replenishStock: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableMonthly(id, data);
      }),
  }),

  // ============ CONSUMABLE SPACES ============
  consumableSpaces: router({
    list: protectedProcedure
      .query(async () => {
        return db.listConsumableSpaces();
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableSpace(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableSpace(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteConsumableSpace(input);
      }),
  }),

  // ============ SUPPLIER SPACES ============
  supplierSpaces: router({
    list: protectedProcedure
      .query(async () => {
        return db.listSupplierSpaces();
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createSupplierSpace(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplierSpace(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteSupplierSpace(input);
      }),
  }),

  // ============ CONTRACT SPACES ============
  contractSpaces: router({
    list: protectedProcedure
      .query(async () => {
        return db.listContractSpaces();
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createContractSpace(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateContractSpace(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteContractSpace(input);
      }),
  }),

  // ============ CONSUMABLES WITH SPACE ============
  consumablesWithSpace: router({
    list: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
        search: z.string().optional(),
        category: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listConsumablesWithSpace(input);
      }),

    listWithWeeklyData: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
        weekStartDate: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listConsumablesWithWeeklyData(input);
      }),

    updateWeeklyStock: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        spaceId: z.number(),
        weekStartDate: z.string(),
        currentStock: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.upsertConsumableWeeklyStock(input);
      }),

    create: protectedProcedure
      .input(z.object({
        spaceId: z.number(),
        name: z.string(),
        category: z.string(),
        unit: z.string(),
        minStock: z.number().default(0),
        maxStock: z.number().default(0),
        currentStock: z.number().default(0),
        replenishStock: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableWithSpace(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        minStock: z.number().optional(),
        maxStock: z.number().optional(),
        currentStock: z.number().optional(),
        replenishStock: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWithSpace(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteConsumableWithSpace(input);
      }),

    listWithMonthlyConsumption: protectedProcedure
      .input(z.object({
        spaceId: z.number(),
        month: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        return db.listConsumablesWithMonthlyConsumption(input);
      }),
  }),

  consumableWeeklyMovements: router({
    list: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
        consumableId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getConsumableWeeklyMovements(input?.spaceId, input?.consumableId);
      }),

    create: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        spaceId: z.number(),
        weekStartDate: z.date(),
        weekNumber: z.number(),
        year: z.number(),
        mondayStock: z.number().default(0),
        tuesdayStock: z.number().default(0),
        wednesdayStock: z.number().default(0),
        thursdayStock: z.number().default(0),
        fridayStock: z.number().default(0),
        saturdayStock: z.number().default(0),
        sundayStock: z.number().default(0),
        totalMovement: z.number().default(0),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK"),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableWeeklyMovement(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        mondayStock: z.number().optional(),
        tuesdayStock: z.number().optional(),
        wednesdayStock: z.number().optional(),
        thursdayStock: z.number().optional(),
        fridayStock: z.number().optional(),
        saturdayStock: z.number().optional(),
        sundayStock: z.number().optional(),
        totalMovement: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWeeklyMovement(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteConsumableWeeklyMovement(input);
      }),

    getHistory: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        spaceId: z.number(),
        weeks: z.number().optional().default(12),
      }))
      .query(async ({ input }) => {
        return db.getConsumableStockHistory(input);
      }),

    getAnalysis: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        spaceId: z.number(),
        weeks: z.number().optional().default(12),
      }))
      .query(async ({ input }) => {
        return db.getConsumableStockAnalysis(input);
      }),

    exportReportExcel: protectedProcedure
      .input(z.object({
        spaceId: z.number(),
        weekStartDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generateReportData, generateExcelReport } = await import('./excel-report');
        const reportData = await generateReportData(input.spaceId, input.weekStartDate);
        const excelPath = await generateExcelReport(reportData);
        return { success: true, excelPath };
      }),

    exportReportPDF: protectedProcedure
      .input(z.object({
        spaceId: z.number(),
        weekStartDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePDFReportData, generatePDFReport } = await import('./pdf-report');
        const reportData = await generatePDFReportData(input.spaceId, input.weekStartDate);
        const pdfPath = await generatePDFReport(reportData);
        return { success: true, pdfPath };
      }),
  }),

  consumableMonthlyMovements: router({
    list: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
        consumableId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getConsumableMonthlyMovements(input?.spaceId, input?.consumableId);
      }),

    create: protectedProcedure
      .input(z.object({
        consumableId: z.number(),
        spaceId: z.number(),
        monthStartDate: z.date(),
        month: z.number(),
        year: z.number(),
        week1Stock: z.number().default(0),
        week2Stock: z.number().default(0),
        week3Stock: z.number().default(0),
        week4Stock: z.number().default(0),
        week5Stock: z.number().default(0),
        totalMovement: z.number().default(0),
        averageStock: z.number().default(0),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).default("ESTOQUE_OK"),
      }))
      .mutation(async ({ input }) => {
        return db.createConsumableMonthlyMovement(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        week1Stock: z.number().optional(),
        week2Stock: z.number().optional(),
        week3Stock: z.number().optional(),
        week4Stock: z.number().optional(),
        week5Stock: z.number().optional(),
        totalMovement: z.number().optional(),
        averageStock: z.number().optional(),
        status: z.enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableMonthlyMovement(id, data);
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return db.deleteConsumableMonthlyMovement(input);
      }),
  }),

  consumableStockAuditLog: router({
    list: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
        consumableId: z.number().optional(),
        weekStartDate: z.date().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getStockAuditLog(input);
      }),

    getByWeeklyMovement: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getStockAuditLogByWeeklyMovement(input);
      }),

    create: protectedProcedure
      .input(z.object({
        consumableWeeklyMovementId: z.number(),
        consumableId: z.number(),
        spaceId: z.number(),
        weekStartDate: z.date(),
        userId: z.number(),
        previousValue: z.number(),
        newValue: z.number(),
        fieldName: z.string(),
        changeReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createStockAuditLog(input);
      }),
  }),

  dashboard: router({
    getStockAlerts: protectedProcedure
      .input(z.object({
        spaceId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getStockAlerts(input?.spaceId);
      }),

    getStockAlertsBySpace: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getStockAlertsBySpace(input);
      }),
  }),


});

export type AppRouter = typeof appRouter;
