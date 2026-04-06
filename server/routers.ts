import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  editorProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { comparePassword, generateToken, hashPassword } from "./auth.helpers";
import { TRPCError } from "@trpc/server";

const DEFAULT_ADMIN = {
  openId: "local-admin",
  name: "Administrador",
  email: "admin@admin.com",
  role: "superadmin" as const,
};

const LEGACY_ADMIN_OPEN_IDS = ["local-admin", "admin-local"];
const LEGACY_ADMIN_EMAILS = ["admin@admin.com", "admin@local.com"];

const DATE_MASK_REGEX = /^\d{2}-\d{2}-\d{4}$/;

type LoginAttemptState = {
  failedAttempts: number;
  firstFailedAt: number;
  lockedUntil: number;
};

const loginAttemptStore = new Map<string, LoginAttemptState>();

const LOGIN_MAX_FAILED_ATTEMPTS = Math.max(
  1,
  Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS ?? "5") || 5
);
const LOGIN_LOCK_MINUTES = Math.max(
  1,
  Number(process.env.LOGIN_LOCK_MINUTES ?? "15") || 15
);
const LOGIN_WINDOW_MINUTES = Math.max(
  1,
  Number(process.env.LOGIN_WINDOW_MINUTES ?? "30") || 30
);
const DEFAULT_ADMIN_PASSWORD = "admin123";
const ALLOW_DEFAULT_ADMIN_LOGIN =
  process.env.ALLOW_DEFAULT_ADMIN_LOGIN !== "false";

function getClientIp(req: { ip?: string; headers?: Record<string, unknown> }) {
  const forwardedFor = req.headers?.["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0]?.trim().toLowerCase() || "unknown";
  }

  return req.ip?.toLowerCase() || "unknown";
}

function buildLoginAttemptKey(
  loginIdentifier: string,
  req: { ip?: string; headers?: Record<string, unknown> }
) {
  return `${loginIdentifier}::${getClientIp(req)}`;
}

function getRemainingLockMinutes(lockMs: number) {
  return Math.max(1, Math.ceil(lockMs / 60_000));
}

function getCurrentAttemptState(loginAttemptKey: string, now: number) {
  const current = loginAttemptStore.get(loginAttemptKey);
  if (!current) return null;

  const windowMs = LOGIN_WINDOW_MINUTES * 60_000;
  if (current.lockedUntil <= now && now - current.firstFailedAt > windowMs) {
    loginAttemptStore.delete(loginAttemptKey);
    return null;
  }

  return current;
}

function registerFailedLoginAttempt(loginAttemptKey: string, now: number) {
  const current = getCurrentAttemptState(loginAttemptKey, now);

  const next: LoginAttemptState = current
    ? {
        ...current,
        failedAttempts: current.failedAttempts + 1,
      }
    : {
        failedAttempts: 1,
        firstFailedAt: now,
        lockedUntil: 0,
      };

  if (next.failedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS) {
    next.lockedUntil = now + LOGIN_LOCK_MINUTES * 60_000;
  }

  loginAttemptStore.set(loginAttemptKey, next);
  return next;
}

function clearFailedLoginAttempts(loginAttemptKey: string) {
  loginAttemptStore.delete(loginAttemptKey);
}

function throwUnauthorizedWithRateLimit(loginAttemptKey: string): never {
  const now = Date.now();
  const next = registerFailedLoginAttempt(loginAttemptKey, now);

  if (next.lockedUntil > now) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas tentativas de login. Tente novamente em ${getRemainingLockMinutes(
        next.lockedUntil - now
      )} minuto(s).`,
    });
  }

  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Usuário ou senha incorretos",
  });
}

function parseMaskedDate(value: string) {
  if (!DATE_MASK_REGEX.test(value)) return null;

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

async function ensureDefaultAdminUser() {
  let user = await db.getUserByEmail(DEFAULT_ADMIN.email);

  if (!user) {
    for (const email of LEGACY_ADMIN_EMAILS) {
      user = await db.getUserByEmail(email);
      if (user) break;
    }
  }

  if (!user) {
    for (const openId of LEGACY_ADMIN_OPEN_IDS) {
      user = (await db.getUserByOpenId(openId)) ?? null;
      if (user) break;
    }
  }

  if (!user) {
    const passwordHash = await hashPassword("admin123");
    await db.createUser({
      openId: DEFAULT_ADMIN.openId,
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      loginMethod: "password",
      password: passwordHash,
      role: DEFAULT_ADMIN.role,
      isActive: true,
    } as any);

    user = await db.getUserByEmail(DEFAULT_ADMIN.email);
  }

  if (!user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao criar usuário administrador padrão",
    });
  }

  if (!user.password) {
    const passwordHash = await hashPassword("admin123");
    await db.updateUserPassword(user.id, passwordHash);
    user = await db.getUserById(user.id);
  }

  if (user && user.role !== DEFAULT_ADMIN.role) {
    await db.updateUserRole(user.id, DEFAULT_ADMIN.role);
    user = await db.getUserById(user.id);
  }

  if (!user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Falha ao configurar usuário administrador",
    });
  }

  return user;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    login: publicProcedure
      .input(
        z.object({
          email: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const loginIdentifier = input.email.trim().toLowerCase();
        const isAdminShortcutLogin = loginIdentifier === "admin";
        const loginAttemptKey = buildLoginAttemptKey(loginIdentifier, ctx.req);
        const now = Date.now();

        const attemptState = getCurrentAttemptState(loginAttemptKey, now);
        if (attemptState?.lockedUntil && attemptState.lockedUntil > now) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Muitas tentativas de login. Tente novamente em ${getRemainingLockMinutes(
              attemptState.lockedUntil - now
            )} minuto(s).`,
          });
        }

        if (
          isAdminShortcutLogin &&
          input.password === DEFAULT_ADMIN_PASSWORD &&
          ALLOW_DEFAULT_ADMIN_LOGIN
        ) {
          clearFailedLoginAttempts(loginAttemptKey);
          const token = generateToken(1, "admin");
          return {
            success: true,
            token,
            user: {
              id: 1,
              name: DEFAULT_ADMIN.name,
              email: DEFAULT_ADMIN.email,
              role: DEFAULT_ADMIN.role,
            },
          };
        }

        if (
          isAdminShortcutLogin &&
          input.password === DEFAULT_ADMIN_PASSWORD &&
          !ALLOW_DEFAULT_ADMIN_LOGIN
        ) {
          throwUnauthorizedWithRateLimit(loginAttemptKey);
        }

        let user: Awaited<ReturnType<typeof db.getUserByEmail>> = null;

        try {
          user = isAdminShortcutLogin
            ? await ensureDefaultAdminUser()
            : await db.getUserByEmail(loginIdentifier);
        } catch (error) {
          console.warn("[Auth] DB lookup failed during login:", error);

          if (
            isAdminShortcutLogin &&
            input.password === DEFAULT_ADMIN_PASSWORD &&
            ALLOW_DEFAULT_ADMIN_LOGIN
          ) {
            clearFailedLoginAttempts(loginAttemptKey);
            const token = generateToken(1, "admin");
            return {
              success: true,
              token,
              user: {
                id: 1,
                name: DEFAULT_ADMIN.name,
                email: DEFAULT_ADMIN.email,
                role: DEFAULT_ADMIN.role,
              },
            };
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao consultar usuário no banco de dados",
          });
        }

        if (!user || !user.password) {
          throwUnauthorizedWithRateLimit(loginAttemptKey);
        }

        let passwordMatches = await comparePassword(
          input.password,
          user.password
        );

        if (
          !passwordMatches &&
          LEGACY_ADMIN_OPEN_IDS.includes(user.openId) &&
          input.password === DEFAULT_ADMIN_PASSWORD
        ) {
          if (ALLOW_DEFAULT_ADMIN_LOGIN) {
            const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
            await db.updateUserPassword(user.id, passwordHash);
            user = await db.getUserById(user.id);
            if (!user || !user.password) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Falha ao atualizar senha do administrador",
              });
            }
            passwordMatches = true;
          } else {
            throwUnauthorizedWithRateLimit(loginAttemptKey);
          }
        }

        if (!passwordMatches) {
          throwUnauthorizedWithRateLimit(loginAttemptKey);
        }

        if (!user.isActive) {
          throwUnauthorizedWithRateLimit(loginAttemptKey);
        }

        await db.updateUserLastLogin(user.id);
        user = await db.getUserById(user.id);

        if (!user) {
          throwUnauthorizedWithRateLimit(loginAttemptKey);
        }

        clearFailedLoginAttempts(loginAttemptKey);
        const token = generateToken(user.id, user.role);
        return {
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    me: protectedProcedure.query(opts => opts.ctx.user),
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
      .input(
        z
          .object({
            category: z.string().optional(),
            status: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listInventory(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getInventoryById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string(),
          quantity: z.number().default(0),
          minQuantity: z.number().default(5),
          unit: z.string().default("unidade"),
          location: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createInventory(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          quantity: z.number().optional(),
          minQuantity: z.number().optional(),
          unit: z.string().optional(),
          location: z.string().optional(),
          status: z.enum(["ativo", "inativo", "descontinuado"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateInventory(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteInventory(input);
    }),

    addMovement: editorProcedure
      .input(
        z.object({
          inventoryId: z.number(),
          type: z.enum(["entrada", "saida"]),
          quantity: z.number(),
          reason: z.string().optional(),
        })
      )
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

    getAllMovements: protectedProcedure.query(async () => {
      return db.getAllInventoryMovements();
    }),
  }),

  // ============ EQUIPA ============
  teams: router({
    list: protectedProcedure
      .input(
        z
          .object({
            role: z.string().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listTeams(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getTeamById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(["limpeza", "manutencao", "admin"]),
          sector: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createTeam(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          role: z.enum(["limpeza", "manutencao", "admin"]).optional(),
          sector: z.string().optional(),
          status: z.enum(["ativo", "inativo"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateTeam(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteTeam(input);
    }),
  }),

  // ============ SALAS ============
  rooms: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listRooms(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getRoomById(input);
    }),

    create: editorProcedure
      .input(
        z
          .object({
            name: z.string(),
            capacity: z.number(),
            location: z.string(),
            type: z.enum(["sala", "auditorio", "cozinha", "outro"]),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
          })
          .refine(
            data => {
              if (data.startDate && data.endDate) {
                const startDate = parseMaskedDate(data.startDate);
                const endDate = parseMaskedDate(data.endDate);
                if (!startDate || !endDate) return false;

                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                return endDate.getTime() >= startDate.getTime();
              }
              return true;
            },
            {
              message: "Data de termino nao pode ser anterior a data de inicio",
              path: ["endDate"],
            }
          )
      )
      .mutation(async ({ input }) => {
        return db.createRoom(input);
      }),

    update: editorProcedure
      .input(
        z
          .object({
            id: z.number(),
            name: z.string().optional(),
            capacity: z.number().optional(),
            location: z.string().optional(),
            type: z.enum(["sala", "auditorio", "cozinha", "outro"]).optional(),
            status: z.enum(["disponivel", "ocupada", "manutencao"]).optional(),
            responsibleUserName: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
          })
          .refine(
            data => {
              if (data.startDate && data.endDate) {
                const startDate = parseMaskedDate(data.startDate);
                const endDate = parseMaskedDate(data.endDate);
                if (!startDate || !endDate) return false;

                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                return endDate.getTime() >= startDate.getTime();
              }
              return true;
            },
            {
              message: "Data de termino nao pode ser anterior a data de inicio",
              path: ["endDate"],
            }
          )
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateRoom(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteRoom(input);
    }),

    getUsageStats: protectedProcedure
      .input(z.number().optional())
      .query(async ({ input }) => {
        if (!input) return db.getAllRoomsUsageStats();
        return db.getRoomUsageStats(input);
      }),

    getAllUsageStats: protectedProcedure.query(async () => {
      return db.getAllRoomsUsageStats();
    }),
  }),

  // ============ RESERVAS DE SALAS ============
  roomReservations: router({
    list: protectedProcedure
      .input(
        z
          .object({
            roomId: z.number().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listRoomReservations(input);
      }),

    create: editorProcedure
      .input(
        z.object({
          roomId: z.number(),
          startTime: z.date(),
          endTime: z.date(),
          purpose: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createRoomReservation({
          ...input,
          userId: ctx.user.id,
          startTime: new Date(input.startTime).toISOString(),
          endTime: new Date(input.endTime).toISOString(),
        });
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          roomId: z.number().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          purpose: z.string().optional(),
          status: z.enum(["confirmada", "pendente", "cancelada"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, startTime, endTime, ...rest } = input;
        return db.updateRoomReservation(id, {
          ...rest,
          startTime: startTime ? new Date(startTime).toISOString() : undefined,
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
        });
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteRoomReservation(input);
    }),
  }),

  // ============ MANUTENÇÃO ============
  maintenance: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            priority: z.string().optional(),
            assignedTo: z.number().optional(),
            spaceId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listMaintenanceRequests(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getMaintenanceRequestById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          department: z.string().optional(),
          requestDate: z
            .string()
            .regex(/^\d{2}-\d{2}-\d{4}$/)
            .optional(),
          priority: z
            .enum(["baixa", "media", "alta", "urgente"])
            .default("media"),
          type: z.enum(["preventiva", "correctiva"]),
          spaceId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createMaintenanceRequest({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          department: z.string().optional(),
          requestDate: z
            .string()
            .regex(/^\d{2}-\d{2}-\d{4}$/)
            .optional(),
          priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
          type: z.enum(["preventiva", "correctiva"]).optional(),
          status: z
            .enum(["aberto", "em_progresso", "concluido", "cancelado"])
            .optional(),
          assignedTo: z.number().optional(),
          notes: z.string().optional(),
          completedAt: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, completedAt, ...data } = input;
        return db.updateMaintenanceRequest(id, {
          ...data,
          completedAt: completedAt ? completedAt.toISOString() : undefined,
        });
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteMaintenanceRequest(input);
    }),
  }),

  // ============ FORNECEDORES ============
  suppliers: router({
    list: protectedProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listSuppliers(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getSupplierById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          companyName: z.string(),
          serviceTypes: z.array(z.string()),
          contact: z.string(),
          contactPerson: z.string(),
          status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createSupplier(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          companyName: z.string().optional(),
          serviceTypes: z.array(z.string()).optional(),
          contact: z.string().optional(),
          contactPerson: z.string().optional(),
          status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplier(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteSupplier(input);
    }),
  }),

  // Fornecedores por Espaço
  suppliersWithSpace: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listSuppliersWithSpace(input?.spaceId);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getSupplierWithSpaceById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          spaceId: z.number(),
          companyName: z.string(),
          serviceTypes: z.array(z.string()),
          contact: z.string(),
          contactPerson: z.string(),
          status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createSupplierWithSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          companyName: z.string().optional(),
          serviceTypes: z.array(z.string()).optional(),
          contact: z.string().optional(),
          contactPerson: z.string().optional(),
          status: z.enum(["ativo", "inativo", "suspenso"]).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplierWithSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteSupplierWithSpace(input);
    }),
  }),

  // ============ CONSUMÍVEIS ============
  consumables: router({
    list: protectedProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
            status: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listConsumables(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getConsumableById(input);
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string(),
          unit: z.string(),
          minStock: z.number().default(0),
          maxStock: z.number().default(0),
          currentStock: z.number().default(0),
          replenishStock: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumable(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          unit: z.string().optional(),
          minStock: z.number().optional(),
          maxStock: z.number().optional(),
          currentStock: z.number().optional(),
          replenishStock: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumable(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteConsumable(input);
    }),

    listWeekly: protectedProcedure
      .input(
        z
          .object({
            consumableId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listConsumablesWeekly(input);
      }),

    createWeekly: editorProcedure
      .input(
        z.object({
          consumableId: z.number(),
          weekStartDate: z.date(),
          minStock: z.number(),
          maxStock: z.number(),
          currentStock: z.number(),
          replenishStock: z.number(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .default("ESTOQUE_OK"),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableWeekly({
          ...input,
          weekStartDate: input.weekStartDate.toISOString().split("T")[0],
        });
      }),

    updateWeekly: editorProcedure
      .input(
        z.object({
          id: z.number(),
          minStock: z.number().optional(),
          maxStock: z.number().optional(),
          currentStock: z.number().optional(),
          replenishStock: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWeekly(id, data);
      }),

    listMonthly: protectedProcedure
      .input(
        z
          .object({
            consumableId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listConsumablesMonthly(input);
      }),

    createMonthly: editorProcedure
      .input(
        z.object({
          consumableId: z.number(),
          monthStartDate: z.date(),
          minStock: z.number(),
          maxStock: z.number(),
          currentStock: z.number(),
          replenishStock: z.number(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .default("ESTOQUE_OK"),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableMonthly({
          ...input,
          monthStartDate: input.monthStartDate.toISOString().split("T")[0],
        });
      }),

    updateMonthly: editorProcedure
      .input(
        z.object({
          id: z.number(),
          minStock: z.number().optional(),
          maxStock: z.number().optional(),
          currentStock: z.number().optional(),
          replenishStock: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableMonthly(id, data);
      }),
  }),

  // ============ CONSUMABLE SPACES ============
  consumableSpaces: router({
    list: protectedProcedure.query(async () => {
      return db.listConsumableSpaces();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteConsumableSpace(input);
    }),
  }),

  // ============ SUPPLIER SPACES ============
  supplierSpaces: router({
    list: protectedProcedure.query(async () => {
      return db.listSupplierSpaces();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createSupplierSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplierSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteSupplierSpace(input);
    }),
  }),

  // ============ CONTRACT SPACES ============
  contractSpaces: router({
    list: protectedProcedure.query(async () => {
      return db.listContractSpaces();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createContractSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateContractSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteContractSpace(input);
    }),
  }),

  // ============ CONTRACTS WITH SPACE ============
  contractsWithSpace: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listContractsWithSpace(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getContractWithSpaceById(input);
    }),

    create: editorProcedure
      .input(
        z
          .object({
            spaceId: z.number(),
            companyName: z.string(),
            cnpj: z.string(),
            description: z.string(),
            contact: z.string(),
            value: z.number(),
            contractType: z.enum(["mensal", "anual"]),
            startDate: z
              .string()
              .regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY"),
            endDate: z
              .string()
              .regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY"),
            isRenewable: z.boolean(),
            status: z.enum(["ativo", "inativo", "vencido"]).optional(),
            notes: z.string().optional(),
          })
          .refine(
            data => {
              const startDate = parseMaskedDate(data.startDate);
              const endDate = parseMaskedDate(data.endDate);
              if (!startDate || !endDate) return false;

              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);

              return endDate.getTime() >= startDate.getTime();
            },
            {
              message: "Data de fim nao pode ser anterior a data de inicio",
              path: ["endDate"],
            }
          )
      )
      .mutation(async ({ input }) => {
        const { spaceId, startDate, value, ...rest } = input;
        return db.createContractWithSpace(spaceId, {
          ...rest,
          signatureDate: startDate,
          value: value.toString(),
        } as any);
      }),

    update: editorProcedure
      .input(
        z
          .object({
            id: z.number(),
            spaceId: z.number().optional(),
            companyName: z.string().optional(),
            cnpj: z.string().optional(),
            description: z.string().optional(),
            contact: z.string().optional(),
            value: z.number().optional(),
            contractType: z.enum(["mensal", "anual"]).optional(),
            startDate: z
              .string()
              .regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY")
              .optional(),
            endDate: z
              .string()
              .regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY")
              .optional(),
            isRenewable: z.boolean().optional(),
            status: z.enum(["ativo", "inativo", "vencido"]).optional(),
            notes: z.string().optional(),
          })
          .refine(
            data => {
              if (!data.startDate || !data.endDate) return true;

              const startDate = parseMaskedDate(data.startDate);
              const endDate = parseMaskedDate(data.endDate);
              if (!startDate || !endDate) return false;

              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);

              return endDate.getTime() >= startDate.getTime();
            },
            {
              message: "Data de fim nao pode ser anterior a data de inicio",
              path: ["endDate"],
            }
          )
      )
      .mutation(async ({ input }) => {
        const { id, spaceId, startDate, value, ...rest } = input;

        return db.updateContractWithSpace(
          id,
          {
            ...rest,
            signatureDate: startDate,
            value: value !== undefined ? value.toString() : undefined,
          } as any,
          spaceId
        );
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteContractWithSpace(input);
    }),
  }),

  // ============ MAINTENANCE SPACES ============
  maintenanceSpaces: router({
    list: protectedProcedure.query(async () => {
      return db.listMaintenanceSpaces();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createMaintenanceSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMaintenanceSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteMaintenanceSpace(input);
    }),
  }),

  // ============ CONSUMABLES WITH SPACE ============
  consumablesWithSpace: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            search: z.string().optional(),
            category: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listConsumablesWithSpace(input);
      }),

    listWithWeeklyData: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            weekStartDate: z.string().optional(),
            category: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listConsumablesWithWeeklyData(input);
      }),

    updateWeeklyStock: editorProcedure
      .input(
        z.object({
          consumableId: z.number(),
          spaceId: z.number(),
          weekStartDate: z.string(),
          currentStock: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return db.upsertConsumableWeeklyStock(input);
      }),

    create: editorProcedure
      .input(
        z.object({
          spaceId: z.number(),
          name: z.string(),
          category: z.string(),
          unit: z.string(),
          minStock: z.number().default(0),
          maxStock: z.number().default(0),
          currentStock: z.number().default(0),
          replenishStock: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableWithSpace(input);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          unit: z.string().optional(),
          minStock: z.number().optional(),
          maxStock: z.number().optional(),
          currentStock: z.number().optional(),
          replenishStock: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWithSpace(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteConsumableWithSpace(input);
    }),

    listWithMonthlyConsumption: protectedProcedure
      .input(
        z.object({
          spaceId: z.number(),
          month: z.number(),
          year: z.number(),
        })
      )
      .query(async ({ input }) => {
        return db.listConsumablesWithMonthlyConsumption(input);
      }),
  }),

  consumableWeeklyMovements: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            consumableId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getConsumableWeeklyMovements(
          input?.spaceId,
          input?.consumableId
        );
      }),

    create: editorProcedure
      .input(
        z.object({
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
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .default("ESTOQUE_OK"),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableWeeklyMovement({
          ...input,
          weekStartDate: input.weekStartDate.toISOString().split("T")[0],
        });
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          mondayStock: z.number().optional(),
          tuesdayStock: z.number().optional(),
          wednesdayStock: z.number().optional(),
          thursdayStock: z.number().optional(),
          fridayStock: z.number().optional(),
          saturdayStock: z.number().optional(),
          sundayStock: z.number().optional(),
          totalMovement: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableWeeklyMovement(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteConsumableWeeklyMovement(input);
    }),

    getHistory: protectedProcedure
      .input(
        z.object({
          consumableId: z.number(),
          spaceId: z.number(),
          weeks: z.number().optional().default(12),
        })
      )
      .query(async ({ input }) => {
        return db.getConsumableStockHistory(input);
      }),

    getAnalysis: protectedProcedure
      .input(
        z.object({
          consumableId: z.number(),
          spaceId: z.number(),
          weeks: z.number().optional().default(12),
        })
      )
      .query(async ({ input }) => {
        return db.getConsumableStockAnalysis(input);
      }),

    exportReportExcel: protectedProcedure
      .input(
        z.object({
          spaceId: z.number(),
          weekStartDate: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { generateReportData, generateExcelReport } = await import(
          "./excel-report"
        );
        const reportData = await generateReportData(
          input.spaceId,
          input.weekStartDate
        );
        const excelPath = await generateExcelReport(reportData);
        return { success: true, excelPath };
      }),

    exportReportPDF: protectedProcedure
      .input(
        z.object({
          spaceId: z.number(),
          weekStartDate: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { generatePDFReportData, generatePDFReport } = await import(
          "./pdf-report"
        );
        const reportData = await generatePDFReportData(
          input.spaceId,
          input.weekStartDate
        );
        const pdfPath = await generatePDFReport(reportData);
        return { success: true, pdfPath };
      }),
  }),

  consumableMonthlyMovements: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            consumableId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getConsumableMonthlyMovements(
          input?.spaceId,
          input?.consumableId
        );
      }),

    create: editorProcedure
      .input(
        z.object({
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
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .default("ESTOQUE_OK"),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConsumableMonthlyMovement({
          ...input,
          monthStartDate: input.monthStartDate.toISOString().split("T")[0],
        });
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          week1Stock: z.number().optional(),
          week2Stock: z.number().optional(),
          week3Stock: z.number().optional(),
          week4Stock: z.number().optional(),
          week5Stock: z.number().optional(),
          totalMovement: z.number().optional(),
          averageStock: z.number().optional(),
          status: z
            .enum(["ESTOQUE_OK", "ACIMA_DO_ESTOQUE", "REPOR_ESTOQUE"])
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateConsumableMonthlyMovement(id, data);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteConsumableMonthlyMovement(input);
    }),
  }),

  consumableStockAuditLog: router({
    list: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
            consumableId: z.number().optional(),
            weekStartDate: z.date().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getStockAuditLog(input);
      }),

    getByWeeklyMovement: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return db.getStockAuditLogByWeeklyMovement(input);
      }),

    create: editorProcedure
      .input(
        z.object({
          consumableWeeklyMovementId: z.number(),
          consumableId: z.number(),
          spaceId: z.number(),
          weekStartDate: z.date(),
          userId: z.number(),
          previousValue: z.number(),
          newValue: z.number(),
          fieldName: z.string(),
          changeReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createStockAuditLog({
          ...input,
          weekStartDate: input.weekStartDate.toISOString().split("T")[0],
        });
      }),
  }),

  dashboard: router({
    getStockAlerts: protectedProcedure
      .input(
        z
          .object({
            spaceId: z.number().optional(),
          })
          .optional()
      )
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
