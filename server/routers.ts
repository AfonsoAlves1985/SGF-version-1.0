import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  editorProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  comparePassword,
  generateToken,
  hashPassword,
  isAdmin,
  isSuperadmin,
  validatePasswordStrength,
} from "./auth.helpers";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const DEFAULT_ADMIN = {
  openId: "local-admin",
  name: "Administrador",
  email: "admin@admin.com",
  role: "superadmin" as const,
};

const LEGACY_ADMIN_OPEN_IDS = ["local-admin", "admin-local"];
const LEGACY_ADMIN_EMAILS = ["admin@admin.com", "admin@local.com"];

const DATE_MASK_REGEX = /^\d{2}-\d{2}-\d{4}$/;
const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_MAX_ATTEMPTS = 3;
const WEBHOOK_RETRY_DELAY_MS = 1200;

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
const DEFAULT_ADMIN_PASSWORD = "admin@2026";
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

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Erro desconhecido";
}

function normalizeAssistantText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferAssistantModule(path?: string) {
  if (!path) return "geral";
  if (path.includes("purchase-requests")) return "compras";
  if (path.includes("inventory")) return "inventario";
  if (path.includes("maintenance")) return "manutencao";
  if (path.includes("rooms")) return "salas";
  if (path.includes("suppliers")) return "fornecedores";
  return "geral";
}

const ASSISTANT_STOPWORDS = new Set([
  "como",
  "qual",
  "quais",
  "onde",
  "com",
  "sem",
  "para",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "uma",
  "umas",
  "um",
  "uns",
  "que",
  "por",
  "mais",
  "menos",
  "esta",
  "estao",
  "está",
  "estão",
  "sobre",
  "a",
  "o",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
]);

function extractAssistantKeywords(question: string) {
  const normalized = normalizeAssistantText(question);
  return normalized
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 4 && !ASSISTANT_STOPWORDS.has(word))
    .slice(0, 5);
}

type AssistantSearchEntry = {
  module: string;
  path: string;
  title: string;
  line: string;
  searchable: string;
};

type PurchaseWebhookAction = "created" | "updated";

async function dispatchPurchaseRequestWebhook(input: {
  requestId: number;
  action: PurchaseWebhookAction;
  webhookUrl: string;
  responsibleEmail?: string;
  callbackUrl?: string;
  actor: {
    id: number;
    name?: string | null;
    email?: string | null;
  };
}) {
  const wait = (ms: number) =>
    new Promise(resolve => {
      setTimeout(resolve, ms);
    });

  const isRetryableStatus = (statusCode: number) =>
    statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input.webhookUrl);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Webhook inválido. Informe uma URL válida.",
    });
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Webhook inválido. Use apenas HTTP ou HTTPS.",
    });
  }

  const purchaseRequest = await db.getPurchaseRequestById(input.requestId);
  if (!purchaseRequest) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Solicitação de compra não encontrada para envio do webhook",
    });
  }

  let lastStatusCode: number | null = null;
  let lastErrorMessage: string | null = null;

  for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          event: `purchase_request.${input.action}`,
          requestId: input.requestId,
          responsibleEmail: input.responsibleEmail || null,
          actor: {
            id: input.actor.id,
            name: input.actor.name || null,
            email: input.actor.email || null,
          },
          integration: {
            callbackUrl: input.callbackUrl || null,
          },
          timestamp: new Date().toISOString(),
          data: purchaseRequest,
        }),
      });

      lastStatusCode = response.status;
      if (response.ok || response.status === 202) {
        return {
          attempted: true,
          delivered: true,
          statusCode: response.status,
          attempts: attempt,
          errorMessage: null,
        };
      }

      lastErrorMessage = `HTTP ${response.status}`;
      if (attempt < WEBHOOK_MAX_ATTEMPTS && isRetryableStatus(response.status)) {
        await wait(WEBHOOK_RETRY_DELAY_MS * attempt);
        continue;
      }

      return {
        attempted: true,
        delivered: false,
        statusCode: response.status,
        attempts: attempt,
        errorMessage: lastErrorMessage,
      };
    } catch (error) {
      lastStatusCode = null;
      lastErrorMessage = getUnknownErrorMessage(error);

      if (attempt < WEBHOOK_MAX_ATTEMPTS) {
        await wait(WEBHOOK_RETRY_DELAY_MS * attempt);
        continue;
      }

      return {
        attempted: true,
        delivered: false,
        statusCode: null,
        attempts: attempt,
        errorMessage: lastErrorMessage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    attempted: true,
    delivered: false,
    statusCode: lastStatusCode,
    attempts: WEBHOOK_MAX_ATTEMPTS,
    errorMessage: lastErrorMessage || "Falha no webhook após tentativas",
  };
}

function ensureAccessManagementUser(user: { role: string } | null) {
  if (!user || !isAdmin(user.role as any)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso permitido apenas para owner e admin",
    });
  }
}

function ensureOwner(user: { role: string } | null) {
  if (!user || !isSuperadmin(user.role as any)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas owner pode excluir usuários",
    });
  }
}

function isOwnerTarget(targetUser: { role: string; openId: string | null }) {
  return (
    targetUser.role === "superadmin" ||
    (Boolean(ENV.ownerOpenId) && targetUser.openId === ENV.ownerOpenId)
  );
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
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
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
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
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
            const token = generateToken(1, DEFAULT_ADMIN.role);
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

  accessManagement: router({
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      ensureAccessManagementUser(ctx.user);
      return db.listUsers();
    }),

    updateUserRole: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["admin", "editor", "viewer"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        ensureAccessManagementUser(ctx.user);

        if (ctx.user.id === input.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você não pode alterar o próprio papel",
          });
        }

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        if (isOwnerTarget(targetUser)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não é permitido alterar owner",
          });
        }

        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    updateUserActive: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        ensureAccessManagementUser(ctx.user);

        if (ctx.user.id === input.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você não pode desativar o próprio acesso",
          });
        }

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        if (isOwnerTarget(targetUser)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não é permitido desativar owner",
          });
        }

        await db.updateUserActive(input.userId, input.isActive);
        return { success: true };
      }),

    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensureOwner(ctx.user);

        if (ctx.user.id === input.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Você não pode excluir o próprio usuário",
          });
        }

        const targetUser = await db.getUserById(input.userId);
        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        if (isOwnerTarget(targetUser)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não é permitido excluir owner",
          });
        }

        if (targetUser.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Só é permitido excluir usuários desativados",
          });
        }

        await db.deleteUserById(targetUser.id);
        return { success: true };
      }),

    listInvitations: protectedProcedure.query(async ({ ctx }) => {
      ensureAccessManagementUser(ctx.user);
      await db.expireOverdueInvitations();
      return db.listUserInvitations();
    }),

    inviteUser: protectedProcedure
      .input(
        z.object({
          email: z.string().email().optional(),
          name: z.string().optional(),
          role: z.enum(["admin", "editor", "viewer"]),
          baseUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        ensureAccessManagementUser(ctx.user);

        const token = randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const normalizedEmail = input.email?.trim().toLowerCase();
        const inviteEmail =
          normalizedEmail || `pending-${token.slice(0, 12)}@invite.local`;

        if (normalizedEmail) {
          const existingUser = await db.getUserByEmail(normalizedEmail);

          if (existingUser?.role === "superadmin") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Não é permitido convidar outro owner por este fluxo",
            });
          }
        }

        await db.createUserInvitation({
          email: inviteEmail,
          name: input.name?.trim() || null,
          role: input.role,
          token,
          status: "pending",
          invitedByUserId: ctx.user.id,
          expiresAt,
          acceptedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

        const safeBaseUrl = input.baseUrl?.replace(/\/$/, "") ?? "";
        const invitationLink = `${safeBaseUrl}/login?inviteToken=${token}`;

        return {
          success: true,
          invitationLink,
          expiresAt,
          email: normalizedEmail ?? null,
        };
      }),

    revokeInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensureAccessManagementUser(ctx.user);
        await db.revokeUserInvitation(input.invitationId);
        return { success: true };
      }),

    deleteInvitation: protectedProcedure
      .input(z.object({ invitationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        ensureAccessManagementUser(ctx.user);

        const invitation = await db.getUserInvitationById(input.invitationId);
        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Convite não encontrado",
          });
        }

        await db.deleteUserInvitation(input.invitationId);
        return { success: true };
      }),

    getInvitationByToken: publicProcedure
      .input(z.object({ token: z.string().min(20) }))
      .query(async ({ input }) => {
        await db.expireOverdueInvitations();

        const invitation = await db.getUserInvitationByToken(input.token);
        if (!invitation || invitation.status !== "pending") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Convite inválido ou expirado",
          });
        }

        if (invitation.expiresAt < new Date()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Convite expirado",
          });
        }

        const isPlaceholderEmail = invitation.email.endsWith("@invite.local");

        return {
          email: isPlaceholderEmail ? null : invitation.email,
          name: invitation.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          requiresLogin: isPlaceholderEmail,
        };
      }),

    acceptInvitation: publicProcedure
      .input(
        z.object({
          token: z.string().min(20),
          login: z.string().min(3),
          name: z.string().min(2),
          password: z.string().min(8),
        })
      )
      .mutation(async ({ input }) => {
        await db.expireOverdueInvitations();

        const invitation = await db.getUserInvitationByToken(input.token);
        if (!invitation || invitation.status !== "pending") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Convite inválido ou expirado",
          });
        }

        if (invitation.expiresAt < new Date()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Convite expirado",
          });
        }

        const passwordValidation = validatePasswordStrength(input.password);
        if (!passwordValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordValidation.errors.join("; "),
          });
        }

        const normalizedLogin = input.login.trim().toLowerCase();

        if (normalizedLogin === "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Login reservado. Escolha outro login",
          });
        }

        const passwordHash = await hashPassword(input.password);
        const existingUser = await db.getUserByEmail(normalizedLogin);

        if (existingUser) {
          if (existingUser.role === "superadmin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Não é permitido alterar owner por convite",
            });
          }

          await db.updateUserByEmail(normalizedLogin, {
            name: input.name,
            password: passwordHash,
            role: invitation.role,
            loginMethod: "password",
            isActive: true,
          });
        } else {
          await db.createUser({
            openId: `invite-${normalizedLogin}`,
            name: input.name,
            email: normalizedLogin,
            loginMethod: "password",
            password: passwordHash,
            role: invitation.role,
            isActive: true,
          } as any);
        }

        await db.markUserInvitationAccepted(invitation.id);

        return { success: true };
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

  // ============ UNIDADES DE INVENTÁRIO ============
  inventorySpaces: router({
    list: protectedProcedure.query(async () => {
      return db.listInventorySpaces();
    }),

    create: editorProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createInventorySpace({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          location: input.location?.trim() || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
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

        const payload = {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined
            ? { description: data.description.trim() || null }
            : {}),
          ...(data.location !== undefined
            ? { location: data.location.trim() || null }
            : {}),
        };

        return db.updateInventorySpace(id, payload as any);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteInventorySpace(input);
    }),
  }),

  // ============ BENS DO INVENTÁRIO POR UNIDADE ============
  inventoryAssets: router({
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
        return db.listInventoryAssets(input);
      }),

    create: editorProcedure
      .input(
        z.object({
          spaceId: z.number(),
          filial: z.string().min(1),
          nrBem: z.string().min(1),
          descricao: z.string().min(1),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          conta: z.string().min(1),
          centroCusto: z.string().min(1),
          local: z.string().optional(),
          responsavel: z.string().optional(),
          fornecedor: z.string().optional(),
          dtAquis: z.string().regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY"),
          anoAquis: z.number().int().optional(),
          vlrCusto: z.number().nonnegative(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createInventoryAsset({
          spaceId: input.spaceId,
          filial: input.filial.trim(),
          nrBem: input.nrBem.trim(),
          descricao: input.descricao.trim(),
          marca: input.marca?.trim() || null,
          modelo: input.modelo?.trim() || null,
          conta: input.conta.trim(),
          centroCusto: input.centroCusto.trim(),
          local: input.local?.trim() || null,
          responsavel: input.responsavel?.trim() || null,
          fornecedor: input.fornecedor?.trim() || null,
          dtAquis: input.dtAquis,
          anoAquis: input.anoAquis ?? null,
          vlrCusto: input.vlrCusto.toFixed(2),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          filial: z.string().min(1).optional(),
          nrBem: z.string().min(1).optional(),
          descricao: z.string().min(1).optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          conta: z.string().min(1).optional(),
          centroCusto: z.string().min(1).optional(),
          local: z.string().optional(),
          responsavel: z.string().optional(),
          fornecedor: z.string().optional(),
          dtAquis: z
            .string()
            .regex(DATE_MASK_REGEX, "Use formato DD-MM-YYYY")
            .optional(),
          anoAquis: z.number().int().optional(),
          vlrCusto: z.number().nonnegative().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        const payload = {
          ...(data.filial !== undefined ? { filial: data.filial.trim() } : {}),
          ...(data.nrBem !== undefined ? { nrBem: data.nrBem.trim() } : {}),
          ...(data.descricao !== undefined
            ? { descricao: data.descricao.trim() }
            : {}),
          ...(data.marca !== undefined ? { marca: data.marca.trim() || null } : {}),
          ...(data.modelo !== undefined
            ? { modelo: data.modelo.trim() || null }
            : {}),
          ...(data.conta !== undefined ? { conta: data.conta.trim() } : {}),
          ...(data.centroCusto !== undefined
            ? { centroCusto: data.centroCusto.trim() }
            : {}),
          ...(data.local !== undefined ? { local: data.local.trim() || null } : {}),
          ...(data.responsavel !== undefined
            ? { responsavel: data.responsavel.trim() || null }
            : {}),
          ...(data.fornecedor !== undefined
            ? { fornecedor: data.fornecedor.trim() || null }
            : {}),
          ...(data.dtAquis !== undefined ? { dtAquis: data.dtAquis } : {}),
          ...(data.anoAquis !== undefined ? { anoAquis: data.anoAquis } : {}),
          ...(data.vlrCusto !== undefined
            ? { vlrCusto: data.vlrCusto.toFixed(2) }
            : {}),
        };

        return db.updateInventoryAsset(id, payload as any);
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      return db.deleteInventoryAsset(input);
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

  // ============ SOLICITAÇÃO DE COMPRAS ============
  purchaseRequests: router({
    list: protectedProcedure
      .input(
        z
          .object({
            status: z
              .enum([
                "rascunho",
                "solicitado",
                "cotacao",
                "financeiro",
                "aprovado",
                "pedido_emitido",
                "recebido",
                "cancelado",
              ])
              .optional(),
            urgency: z.enum(["baixa", "normal", "alta"]).optional(),
            company: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.listPurchaseRequests(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return db.getPurchaseRequestById(input);
    }),

    getNextDocumentNumber: editorProcedure.query(async () => {
      return db.getNextPurchaseRequestDocumentNumber();
    }),

    lookupValues: protectedProcedure.query(async () => {
      return db.listPurchaseRequestLookupValues();
    }),

    sendWebhook: editorProcedure
      .input(
        z.object({
          requestId: z.number(),
          action: z.enum(["created", "updated"]).default("updated"),
          webhookUrl: z.string().url(),
          responsibleEmail: z.string().email().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const delivery = await dispatchPurchaseRequestWebhook({
          requestId: input.requestId,
          action: input.action,
          webhookUrl: input.webhookUrl,
          responsibleEmail: input.responsibleEmail,
          callbackUrl: ENV.frzPurchaseCallbackUrl || undefined,
          actor: {
            id: ctx.user.id,
            name: ctx.user.name,
            email: ctx.user.email,
          },
        });

        await db.registerPurchaseWebhookDelivery({
          requestId: input.requestId,
          delivered: delivery.delivered,
          attemptsPerformed: delivery.attempts,
          statusCode: delivery.statusCode,
          errorMessage: delivery.errorMessage,
        });

        return delivery;
      }),

    create: editorProcedure
      .input(
        z.object({
          documentNumber: z.string().min(1),
          requestDate: z.string(),
          neededDate: z.string(),
          urgency: z.enum(["baixa", "normal", "alta"]),
          company: z.string(),
          costCenter: z.string(),
          purchaseType: z.string(),
          requesterName: z.string(),
          requesterRegistration: z.string().optional(),
          requesterRole: z.string().optional(),
          requesterEmail: z.string(),
          requesterPhone: z.string().optional(),
          supplierName: z.string().optional(),
          supplierDocument: z.string().optional(),
          supplierContact: z.string().optional(),
          supplierDeliveryEstimate: z.string().optional(),
          justification: z.string(),
          observations: z.string().optional(),
          attachments: z
            .array(
              z.object({
                name: z.string(),
                size: z.number(),
                type: z.string().optional(),
              })
            )
            .optional(),
          status: z
            .enum([
              "rascunho",
              "solicitado",
              "cotacao",
              "financeiro",
              "aprovado",
              "pedido_emitido",
              "recebido",
              "cancelado",
            ])
            .default("solicitado"),
          financeApproved: z.boolean().optional(),
          billingCnpj: z.string().optional(),
          paymentTerms: z.string().optional(),
          items: z
            .array(
              z.object({
                itemOrder: z.number().optional(),
                description: z.string().min(1),
                unit: z.string().min(1),
                quantity: z.number().positive(),
                unitPrice: z.number().nonnegative(),
                supplierSuggestion: z.string().optional(),
              })
            )
            .default([]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isDraft = input.status === "rascunho";
        const trimmedRequesterEmail = input.requesterEmail.trim().toLowerCase();
        const emailValidation = z.string().email().safeParse(trimmedRequesterEmail);

        const requestDate = parseMaskedDate(input.requestDate);
        const neededDate = parseMaskedDate(input.neededDate);

        if (!isDraft) {
          if (
            !input.requestDate.trim() ||
            !input.neededDate.trim() ||
            !requestDate ||
            !neededDate
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Datas inválidas. Use DD-MM-YYYY",
            });
          }

          if (neededDate.getTime() < requestDate.getTime()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Data necessária não pode ser anterior à data da solicitação",
            });
          }

          if (!input.company.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Empresa é obrigatória",
            });
          }

          if (!input.costCenter.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Centro de custo é obrigatório",
            });
          }

          if (!input.purchaseType.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Tipo de compra é obrigatório",
            });
          }

          if (!input.requesterName.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nome do solicitante é obrigatório",
            });
          }

          if (!emailValidation.success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "E-mail do solicitante inválido",
            });
          }

          if (!input.justification.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Justificativa é obrigatória",
            });
          }

          if (input.items.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Adicione ao menos um item na solicitação",
            });
          }
        }

        const now = new Date();
        const maskToday = `${String(now.getDate()).padStart(2, "0")}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-${now.getFullYear()}`;
        const persistedRequestDate = requestDate ? input.requestDate : maskToday;
        const persistedNeededDate = neededDate ? input.neededDate : persistedRequestDate;
        const persistedRequesterEmail = emailValidation.success
          ? trimmedRequesterEmail
          : "rascunho@pendente.local";

        const id = await db.createPurchaseRequest({
          request: {
            documentNumber: input.documentNumber.trim(),
            requestDate: persistedRequestDate,
            neededDate: persistedNeededDate,
            urgency: input.urgency,
            company: input.company.trim() || "Pendente",
            costCenter: input.costCenter.trim() || "Pendente",
            purchaseType: input.purchaseType.trim() || "Pendente",
            requesterName: input.requesterName.trim() || "Não informado",
            requesterRegistration: input.requesterRegistration?.trim() || null,
            requesterRole: input.requesterRole?.trim() || null,
            requesterEmail: persistedRequesterEmail,
            requesterPhone: input.requesterPhone?.trim() || null,
            supplierName: input.supplierName?.trim() || null,
            supplierDocument: input.supplierDocument?.trim() || null,
            supplierContact: input.supplierContact?.trim() || null,
            supplierDeliveryEstimate:
              input.supplierDeliveryEstimate?.trim() || null,
            justification: input.justification.trim() || "Rascunho em preenchimento",
            observations: input.observations?.trim() || null,
            attachments: input.attachments || null,
            status: input.status,
            completedAt: input.status === "recebido" ? new Date() : null,
            financeApproved: input.financeApproved ?? false,
            billingCnpj: input.billingCnpj?.trim() || null,
            paymentTerms: input.paymentTerms?.trim() || null,
            createdBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          items: input.items.map(item => ({
            itemOrder: item.itemOrder,
            description: item.description.trim(),
            unit: item.unit.trim(),
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            totalPrice: (item.quantity * item.unitPrice).toFixed(2),
            supplierSuggestion: item.supplierSuggestion?.trim() || null,
          })),
        });

        return { success: true, id };
      }),

    update: editorProcedure
      .input(
        z.object({
          id: z.number(),
          documentNumber: z.string().min(1).optional(),
          requestDate: z.string().optional(),
          neededDate: z.string().optional(),
          urgency: z.enum(["baixa", "normal", "alta"]).optional(),
          company: z.string().optional(),
          costCenter: z.string().optional(),
          purchaseType: z.string().optional(),
          requesterName: z.string().optional(),
          requesterRegistration: z.string().optional(),
          requesterRole: z.string().optional(),
          requesterEmail: z.string().optional(),
          requesterPhone: z.string().optional(),
          supplierName: z.string().optional(),
          supplierDocument: z.string().optional(),
          supplierContact: z.string().optional(),
          supplierDeliveryEstimate: z.string().optional(),
          justification: z.string().optional(),
          observations: z.string().optional(),
          attachments: z
            .array(
              z.object({
                name: z.string(),
                size: z.number(),
                type: z.string().optional(),
              })
            )
            .optional(),
          status: z
            .enum([
              "rascunho",
              "solicitado",
              "cotacao",
              "financeiro",
              "aprovado",
              "pedido_emitido",
              "recebido",
              "cancelado",
            ])
            .optional(),
          financeApproved: z.boolean().optional(),
          billingCnpj: z.string().optional(),
          paymentTerms: z.string().optional(),
          items: z
            .array(
              z.object({
                itemOrder: z.number().optional(),
                description: z.string().min(1),
                unit: z.string().min(1),
                quantity: z.number().positive(),
                unitPrice: z.number().nonnegative(),
                supplierSuggestion: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, items, ...requestData } = input;

        const existingRequest = await db.getPurchaseRequestById(id);
        if (!existingRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Solicitação de compra não encontrada",
          });
        }

        const targetStatus = requestData.status ?? existingRequest.status;
        const isDraft = targetStatus === "rascunho";

        const effectiveRequestDate =
          requestData.requestDate ?? existingRequest.requestDate;
        const effectiveNeededDate = requestData.neededDate ?? existingRequest.neededDate;
        const parsedRequestDate = parseMaskedDate(effectiveRequestDate);
        const parsedNeededDate = parseMaskedDate(effectiveNeededDate);

        if (!isDraft) {
          if (!parsedRequestDate || !parsedNeededDate) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Datas inválidas. Use DD-MM-YYYY",
            });
          }

          if (parsedNeededDate.getTime() < parsedRequestDate.getTime()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Data necessária não pode ser anterior à data da solicitação",
            });
          }

          const effectiveCompany = requestData.company ?? existingRequest.company;
          const effectiveCostCenter =
            requestData.costCenter ?? existingRequest.costCenter;
          const effectivePurchaseType =
            requestData.purchaseType ?? existingRequest.purchaseType;
          const effectiveRequesterName =
            requestData.requesterName ?? existingRequest.requesterName;
          const effectiveJustification =
            requestData.justification ?? existingRequest.justification;
          const effectiveRequesterEmail = (
            requestData.requesterEmail ?? existingRequest.requesterEmail
          )
            .trim()
            .toLowerCase();
          const effectiveItems = items ?? existingRequest.items ?? [];

          if (!effectiveCompany.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Empresa é obrigatória",
            });
          }

          if (!effectiveCostCenter.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Centro de custo é obrigatório",
            });
          }

          if (!effectivePurchaseType.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Tipo de compra é obrigatório",
            });
          }

          if (!effectiveRequesterName.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nome do solicitante é obrigatório",
            });
          }

          if (!z.string().email().safeParse(effectiveRequesterEmail).success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "E-mail do solicitante inválido",
            });
          }

          if (!effectiveJustification.trim()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Justificativa é obrigatória",
            });
          }

          if (effectiveItems.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Adicione ao menos um item na solicitação",
            });
          }
        }

        await db.updatePurchaseRequest(id, {
          request: {
            ...(requestData.documentNumber !== undefined
              ? { documentNumber: requestData.documentNumber.trim() }
              : {}),
            ...(requestData.requestDate !== undefined
              ? { requestDate: requestData.requestDate }
              : {}),
            ...(requestData.neededDate !== undefined
              ? { neededDate: requestData.neededDate }
              : {}),
            ...(requestData.urgency !== undefined
              ? { urgency: requestData.urgency }
              : {}),
            ...(requestData.company !== undefined
              ? { company: requestData.company.trim() }
              : {}),
            ...(requestData.costCenter !== undefined
              ? { costCenter: requestData.costCenter.trim() }
              : {}),
            ...(requestData.purchaseType !== undefined
              ? { purchaseType: requestData.purchaseType.trim() }
              : {}),
            ...(requestData.requesterName !== undefined
              ? { requesterName: requestData.requesterName.trim() }
              : {}),
            ...(requestData.requesterRegistration !== undefined
              ? {
                  requesterRegistration:
                    requestData.requesterRegistration.trim() || null,
                }
              : {}),
            ...(requestData.requesterRole !== undefined
              ? { requesterRole: requestData.requesterRole.trim() || null }
              : {}),
            ...(requestData.requesterEmail !== undefined
              ? { requesterEmail: requestData.requesterEmail.trim().toLowerCase() }
              : {}),
            ...(requestData.requesterPhone !== undefined
              ? { requesterPhone: requestData.requesterPhone.trim() || null }
              : {}),
            ...(requestData.supplierName !== undefined
              ? { supplierName: requestData.supplierName.trim() || null }
              : {}),
            ...(requestData.supplierDocument !== undefined
              ? { supplierDocument: requestData.supplierDocument.trim() || null }
              : {}),
            ...(requestData.supplierContact !== undefined
              ? { supplierContact: requestData.supplierContact.trim() || null }
              : {}),
            ...(requestData.supplierDeliveryEstimate !== undefined
              ? {
                  supplierDeliveryEstimate:
                    requestData.supplierDeliveryEstimate.trim() || null,
                }
              : {}),
            ...(requestData.justification !== undefined
              ? { justification: requestData.justification.trim() }
              : {}),
            ...(requestData.observations !== undefined
              ? { observations: requestData.observations.trim() || null }
              : {}),
            ...(requestData.attachments !== undefined
              ? { attachments: requestData.attachments || null }
              : {}),
            ...(requestData.status !== undefined
              ? {
                  status: requestData.status,
                  completedAt:
                    requestData.status === "recebido" ? new Date() : null,
                }
              : {}),
            ...(requestData.financeApproved !== undefined
              ? { financeApproved: requestData.financeApproved }
              : {}),
            ...(requestData.billingCnpj !== undefined
              ? { billingCnpj: requestData.billingCnpj.trim() || null }
              : {}),
            ...(requestData.paymentTerms !== undefined
              ? { paymentTerms: requestData.paymentTerms.trim() || null }
              : {}),
          },
          ...(items
            ? {
                items: items.map(item => ({
                  itemOrder: item.itemOrder,
                  description: item.description.trim(),
                  unit: item.unit.trim(),
                  quantity: item.quantity,
                  unitPrice: item.unitPrice.toFixed(2),
                  totalPrice: (item.quantity * item.unitPrice).toFixed(2),
                  supplierSuggestion: item.supplierSuggestion?.trim() || null,
                })),
              }
            : {}),
        });

        return { success: true };
      }),

    delete: editorProcedure.input(z.number()).mutation(async ({ input }) => {
      await db.deletePurchaseRequest(input);
      return { success: true };
    }),
  }),

  assistant: router({
    ask: protectedProcedure
      .input(
        z.object({
          question: z.string().min(2),
          context: z
            .object({
              path: z.string().optional(),
              module: z.string().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const question = input.question.trim();
        const normalizedQuestion = normalizeAssistantText(question);
        const keywords = extractAssistantKeywords(question);
        const detectedModule =
          input.context?.module || inferAssistantModule(input.context?.path);
        const isOwnerUser =
          ctx.user.openId === ENV.ownerOpenId ||
          (ctx.user.role === "superadmin" && !ENV.ownerOpenId);

        const loadGlobalSnapshot = async () => {
          const [
            purchaseRequests,
            assets,
            maintenance,
            rooms,
            suppliers,
            consumables,
            users,
            teams,
            reservations,
            logs,
          ] = await Promise.all([
            db.listPurchaseRequests(),
            db.listInventoryAssets(),
            db.listMaintenanceRequests(),
            db.listRooms(),
            db.listSuppliersWithSpace(),
            db.listConsumables(),
            db.listUsers(),
            db.listTeams(),
            db.listRoomReservations(),
            db.listAuditLogsDetailed({ limit: 120, offset: 0 }),
          ]);

          return {
            purchaseRequests,
            assets,
            maintenance,
            rooms,
            suppliers,
            consumables,
            users,
            teams,
            reservations,
            logs,
          };
        };

        const asksSystemOverview =
          normalizedQuestion.includes("resumo") ||
          normalizedQuestion.includes("visao geral") ||
          normalizedQuestion.includes("visao") ||
          normalizedQuestion.includes("status sistema") ||
          normalizedQuestion.includes("status geral");

        if (asksSystemOverview) {
          const snapshot = await loadGlobalSnapshot();
          const {
            purchaseRequests,
            assets,
            maintenance,
            rooms,
            suppliers,
            consumables,
          } = snapshot;

          const financialPending = purchaseRequests.filter(
            (item: any) => item.status === "financeiro"
          ).length;
          const approvedCount = purchaseRequests.filter(
            (item: any) => item.status === "aprovado"
          ).length;
          const assetsWithoutResponsible = assets.filter(
            (item: any) => !item.responsavel
          ).length;
          const urgentMaintenance = maintenance.filter(
            (item: any) => item.priority === "urgente" || item.priority === "alta"
          ).length;
          const occupiedRooms = rooms.filter((item: any) => item.status === "em_uso").length;
          const activeSuppliers = suppliers.filter((item: any) => item.status === "ativo").length;

          const highlights = [
            `${financialPending} solicitação(ões) em financeiro`,
            `${approvedCount} solicitação(ões) aprovadas`,
            `${assetsWithoutResponsible} bens sem responsável`,
            `${urgentMaintenance} chamados urgentes/alta prioridade`,
            `${occupiedRooms} sala(s) em uso`,
            `${activeSuppliers} fornecedor(es) ativos`,
            `${consumables.length} consumível(is) cadastrado(s)`,
          ];

          if (isOwnerUser) {
            highlights.push(`${snapshot.users.length} usuário(s) total`);
            highlights.push(`${snapshot.teams.length} membro(s) de equipe`);
            highlights.push(`${snapshot.reservations.length} reserva(s) de sala`);
          }

          return {
            answer: [
              "Aqui está uma visão geral atual do sistema, direto no chat:",
              "",
              ...highlights.map((line, index) => `${index + 1}. ${line}`),
              "",
              "Se quiser, posso detalhar qualquer item por módulo agora.",
            ].join("\n"),
            module: "geral",
            confidence: "alta",
            highlights,
            actions: [
              {
                type: "navigate",
                label: "Abrir Solicitação de Compras",
                path: "/purchase-requests",
              },
              { type: "navigate", label: "Abrir Inventário", path: "/inventory" },
              { type: "navigate", label: "Abrir Manutenção", path: "/maintenance" },
            ],
            results: {
              metrics: {
                purchaseRequests: purchaseRequests.length,
                inventoryAssets: assets.length,
                maintenanceRequests: maintenance.length,
                rooms: rooms.length,
                suppliers: suppliers.length,
                consumables: consumables.length,
                ...(isOwnerUser
                  ? {
                      users: snapshot.users.length,
                      teams: snapshot.teams.length,
                      reservations: snapshot.reservations.length,
                    }
                  : {}),
              },
            },
          };
        }

        if (
          detectedModule === "compras" ||
          normalizedQuestion.includes("compra") ||
          normalizedQuestion.includes("solicit") ||
          normalizedQuestion.includes("financeiro")
        ) {
          const records = await db.listPurchaseRequests();

          const statusTokens: Array<
            | "rascunho"
            | "solicitado"
            | "cotacao"
            | "financeiro"
            | "aprovado"
            | "pedido_emitido"
            | "recebido"
            | "cancelado"
          > = [];

          if (normalizedQuestion.includes("financeiro")) {
            statusTokens.push("financeiro");
          }
          if (normalizedQuestion.includes("aprovad")) {
            statusTokens.push("aprovado");
          }
          if (normalizedQuestion.includes("cancelad") || normalizedQuestion.includes("reprovad")) {
            statusTokens.push("cancelado");
          }
          if (normalizedQuestion.includes("rascunh")) {
            statusTokens.push("rascunho");
          }

          const delayMatch = normalizedQuestion.match(/(\d+)\s*dias?/);
          const overdueDays = delayMatch ? Number(delayMatch[1]) : 3;
          const now = Date.now();
          const threshold = now - overdueDays * 24 * 60 * 60 * 1000;
          const asksOverdue =
            normalizedQuestion.includes("trav") ||
            normalizedQuestion.includes("atras") ||
            normalizedQuestion.includes("pendente");

          const companyMatch = normalizedQuestion.match(/empresa\s+([a-z0-9\s]+)/);
          const companyTerm = companyMatch?.[1]?.trim() || null;

          let filtered = records.filter((record: any) => {
            if (statusTokens.length > 0 && !statusTokens.includes(record.status)) {
              return false;
            }

            if (asksOverdue) {
              const createdAtMs = new Date(record.createdAt).getTime();
              if (Number.isNaN(createdAtMs) || createdAtMs > threshold) {
                return false;
              }
            }

            if (companyTerm) {
              const normalizedCompany = normalizeAssistantText(record.company || "");
              if (!normalizedCompany.includes(companyTerm)) {
                return false;
              }
            }

            if (keywords.length === 0) return true;

            const haystack = normalizeAssistantText(
              [
                record.documentNumber,
                record.company,
                record.requesterName,
                record.justification,
                record.status,
              ]
                .filter(Boolean)
                .join(" ")
            );

            return keywords.some(keyword => haystack.includes(keyword));
          });

          if (filtered.length === 0 && keywords.length > 0) {
            filtered = records.filter((record: any) => {
              const haystack = normalizeAssistantText(
                [
                  record.documentNumber,
                  record.company,
                  record.requesterName,
                  record.justification,
                  record.status,
                ]
                  .filter(Boolean)
                  .join(" ")
              );
              return keywords.some(keyword => haystack.includes(keyword));
            });
          }

          const top = filtered.slice(0, 8).map((record: any) => ({
            id: record.id,
            documentNumber: record.documentNumber,
            company: record.company,
            requesterName: record.requesterName,
            status: record.status,
            urgency: record.urgency,
            totalAmount: record.totalAmount,
          }));

          const suggestedFilters = {
            status: statusTokens[0] || "all",
            urgency: "all",
            company: "all",
            search: keywords[0] || "",
          };

          const previewLines = top
            .slice(0, 5)
            .map(
              (record: any, index: number) =>
                `${index + 1}. ${record.documentNumber} | ${record.status} | ${record.company}`
            );

          const responseText =
            top.length > 0
              ? [
                  `Encontrei ${filtered.length} solicitação(ões) relacionada(s).`,
                  "",
                  "Principais resultados:",
                  ...previewLines,
                  "",
                  "Posso aplicar um filtro agora sem abrir outro módulo.",
                ].join("\n")
              : "Não encontrei solicitações com esse critério no momento. Se quiser, tente informar empresa, status ou período (ex: 5 dias).";

          return {
            answer: responseText,
            module: "compras",
            confidence: top.length > 0 ? "alta" : "media",
            actions: [
              {
                type: "apply_purchase_filters",
                label: "Aplicar filtro sugerido",
                filters: suggestedFilters,
              },
              {
                type: "navigate",
                label: "Abrir Solicitação de Compras",
                path: "/purchase-requests",
              },
            ],
            results: {
              purchaseRequests: top,
            },
          };
        }

        if (
          detectedModule === "inventario" ||
          normalizedQuestion.includes("inventario") ||
          normalizedQuestion.includes("bem") ||
          normalizedQuestion.includes("responsavel")
        ) {
          const assets = await db.listInventoryAssets({
            search: keywords[0] || undefined,
          });

          const filtered = assets
            .filter((asset: any) => {
              if (normalizedQuestion.includes("sem responsavel")) {
                return !asset.responsavel;
              }

              if (keywords.length === 0) return true;

              const haystack = normalizeAssistantText(
                [
                  asset.nrBem,
                  asset.descricao,
                  asset.responsavel,
                  asset.fornecedor,
                  asset.local,
                ]
                  .filter(Boolean)
                  .join(" ")
              );

              return keywords.some(keyword => haystack.includes(keyword));
            })
            .slice(0, 8)
            .map((asset: any) => ({
              id: asset.id,
              nrBem: asset.nrBem,
              descricao: asset.descricao,
              responsavel: asset.responsavel,
              local: asset.local,
            }));

          const assetLines = filtered
            .slice(0, 5)
            .map(
              (asset: any, index: number) =>
                `${index + 1}. ${asset.nrBem} | ${asset.descricao} | ${asset.responsavel || "sem responsável"}`
            );

          const inventoryText =
            filtered.length > 0
              ? [
                  `Encontrei ${filtered.length} bem(ns) no inventário para sua consulta.`,
                  "",
                  "Resultados:",
                  ...assetLines,
                ].join("\n")
              : "Não encontrei bens com esse critério no inventário. Tente informar código do bem, descrição ou responsável.";

          return {
            answer: inventoryText,
            module: "inventario",
            confidence: filtered.length > 0 ? "alta" : "media",
            actions: [
              {
                type: "navigate",
                label: "Abrir Inventário",
                path: "/inventory",
              },
            ],
            results: {
              inventoryAssets: filtered,
            },
          };
        }

        if (
          detectedModule === "manutencao" ||
          normalizedQuestion.includes("manutenc") ||
          normalizedQuestion.includes("chamado")
        ) {
          const maintenance = await db.listMaintenanceRequests();
          const urgent = maintenance
            .filter((item: any) => item.priority === "urgente" || item.priority === "alta")
            .slice(0, 8)
            .map((item: any) => ({
              id: item.id,
              title: item.title,
              status: item.status,
              priority: item.priority,
            }));

          const maintenanceLines = urgent
            .slice(0, 5)
            .map(
              (item: any, index: number) =>
                `${index + 1}. #${item.id} | ${item.priority} | ${item.status} | ${item.title}`
            );

          const maintenanceText =
            urgent.length > 0
              ? [
                  `Há ${urgent.length} chamado(s) urgente(s)/alta prioridade em evidência.`,
                  "",
                  "Resumo:",
                  ...maintenanceLines,
                ].join("\n")
              : "Não há chamados urgentes no momento.";

          return {
            answer: maintenanceText,
            module: "manutencao",
            confidence: "media",
            actions: [
              {
                type: "navigate",
                label: "Abrir Manutenção",
                path: "/maintenance",
              },
            ],
            results: {
              maintenanceRequests: urgent,
            },
          };
        }

        if (
          detectedModule === "salas" ||
          normalizedQuestion.includes("sala") ||
          normalizedQuestion.includes("audit") ||
          normalizedQuestion.includes("auditorio")
        ) {
          const rooms = await db.listRooms();
          const inUse = rooms.filter((item: any) => item.status === "em_uso");
          const available = rooms.filter((item: any) => item.status === "disponivel");
          const maintenanceRooms = rooms.filter((item: any) => item.status === "manutencao");

          const topRooms = rooms.slice(0, 8).map((item: any) => ({
            id: item.id,
            name: item.name,
            status: item.status,
            type: item.type,
          }));

          return {
            answer: [
              `Salas: ${rooms.length} no total.`,
              `${inUse.length} em uso, ${available.length} disponíveis e ${maintenanceRooms.length} em manutenção.`,
              "",
              "Se quiser, posso filtrar por status específico (ex.: apenas em uso).",
            ].join("\n"),
            module: "salas",
            confidence: "alta",
            actions: [
              { type: "navigate", label: "Abrir Salas", path: "/rooms" },
            ],
            results: {
              rooms: topRooms,
              metrics: {
                total: rooms.length,
                inUse: inUse.length,
                available: available.length,
                maintenance: maintenanceRooms.length,
              },
            },
          };
        }

        if (
          detectedModule === "fornecedores" ||
          normalizedQuestion.includes("fornecedor") ||
          normalizedQuestion.includes("servico")
        ) {
          const suppliers = await db.listSuppliersWithSpace();
          const active = suppliers.filter((item: any) => item.status === "ativo");
          const inactive = suppliers.filter((item: any) => item.status === "inativo");

          const topSuppliers = suppliers.slice(0, 8).map((item: any) => ({
            id: item.id,
            companyName: item.companyName,
            status: item.status,
            spaceName: item.spaceName,
          }));

          return {
            answer: [
              `Fornecedores por unidade: ${suppliers.length} no total.`,
              `${active.length} ativo(s) e ${inactive.length} inativo(s).`,
              "",
              "Posso detalhar por unidade, status ou tipo de serviço.",
            ].join("\n"),
            module: "fornecedores",
            confidence: "alta",
            actions: [
              { type: "navigate", label: "Abrir Fornecedores", path: "/suppliers" },
            ],
            results: {
              suppliers: topSuppliers,
            },
          };
        }

        if (normalizedQuestion.includes("consumivel") || normalizedQuestion.includes("estoque")) {
          const consumables = await db.listConsumables();
          const toReplenish = consumables.filter(
            (item: any) => item.status === "REPOR_ESTOQUE"
          );

          const topConsumables = consumables.slice(0, 8).map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            status: item.status,
          }));

          return {
            answer: [
              `Consumíveis: ${consumables.length} no total.`,
              `${toReplenish.length} item(ns) com status de reposição.`,
              "",
              "Posso listar apenas os itens críticos se você quiser.",
            ].join("\n"),
            module: "consumiveis",
            confidence: "media",
            actions: [
              { type: "navigate", label: "Abrir Consumíveis", path: "/consumables" },
            ],
            results: {
              consumables: topConsumables,
            },
          };
        }

        if (
          normalizedQuestion.includes("usuario") ||
          normalizedQuestion.includes("acesso") ||
          normalizedQuestion.includes("auditoria") ||
          normalizedQuestion.includes("log")
        ) {
          if (!isOwnerUser) {
            return {
              answer:
                "Consultas de segurança (usuários, acessos e auditoria) estão disponíveis somente para o Owner.",
              module: "acessos",
              confidence: "alta",
              actions: [],
              results: {},
            };
          }

          const [users, logs] = await Promise.all([
            db.listUsers(),
            db.listAuditLogsDetailed({ limit: 20, offset: 0 }),
          ]);

          const activeUsers = users.filter((item: any) => item.isActive).length;
          const adminUsers = users.filter(
            (item: any) => item.role === "admin" || item.role === "superadmin"
          ).length;

          const latestLogs = logs.slice(0, 6).map((item: any) => ({
            id: item.id,
            module: item.module,
            action: item.action,
            userName: item.userName,
          }));

          return {
            answer: [
              `Usuários: ${users.length} total (${activeUsers} ativos).`,
              `${adminUsers} com perfil admin/superadmin.`,
              `Últimos logs carregados: ${latestLogs.length}.`,
            ].join("\n"),
            module: "acessos",
            confidence: "alta",
            actions: [
              {
                type: "navigate",
                label: "Abrir Administração de Acessos",
                path: "/access-management",
              },
              {
                type: "navigate",
                label: "Abrir Logs de Auditoria",
                path: "/logs",
              },
            ],
            results: {
              users: users.slice(0, 8).map((item: any) => ({
                id: item.id,
                name: item.name,
                role: item.role,
                isActive: item.isActive,
              })),
              auditLogs: latestLogs,
            },
          };
        }

        const snapshot = await loadGlobalSnapshot();
        const entries: AssistantSearchEntry[] = [];

        snapshot.purchaseRequests.forEach((item: any) => {
          entries.push({
            module: "compras",
            path: "/purchase-requests",
            title: item.documentNumber,
            line: `${item.documentNumber} | ${item.status} | ${item.company}`,
            searchable: normalizeAssistantText(
              [
                item.documentNumber,
                item.status,
                item.company,
                item.requesterName,
                item.justification,
              ]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        snapshot.assets.forEach((item: any) => {
          entries.push({
            module: "inventario",
            path: "/inventory",
            title: item.nrBem,
            line: `${item.nrBem} | ${item.descricao} | ${item.responsavel || "sem responsável"}`,
            searchable: normalizeAssistantText(
              [item.nrBem, item.descricao, item.responsavel, item.fornecedor, item.local]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        snapshot.maintenance.forEach((item: any) => {
          entries.push({
            module: "manutencao",
            path: "/maintenance",
            title: `#${item.id}`,
            line: `#${item.id} | ${item.priority} | ${item.status} | ${item.title}`,
            searchable: normalizeAssistantText(
              [item.id, item.priority, item.status, item.title, item.description]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        snapshot.rooms.forEach((item: any) => {
          entries.push({
            module: "salas",
            path: "/rooms",
            title: item.name,
            line: `${item.name} | ${item.status} | ${item.type}`,
            searchable: normalizeAssistantText(
              [item.name, item.status, item.type, item.location]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        snapshot.suppliers.forEach((item: any) => {
          entries.push({
            module: "fornecedores",
            path: "/suppliers",
            title: item.companyName,
            line: `${item.companyName} | ${item.status} | ${item.spaceName || "sem unidade"}`,
            searchable: normalizeAssistantText(
              [item.companyName, item.status, item.spaceName, item.contactPerson, item.notes]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        snapshot.consumables.forEach((item: any) => {
          entries.push({
            module: "consumiveis",
            path: "/consumables",
            title: item.name,
            line: `${item.name} | ${item.category} | ${item.status}`,
            searchable: normalizeAssistantText(
              [item.name, item.category, item.status]
                .filter(Boolean)
                .join(" ")
            ),
          });
        });

        if (isOwnerUser) {
          snapshot.users.forEach((item: any) => {
            entries.push({
              module: "acessos",
              path: "/access-management",
              title: item.name || item.email,
              line: `${item.name || "Sem nome"} | ${item.role} | ${item.isActive ? "ativo" : "inativo"}`,
              searchable: normalizeAssistantText(
                [item.name, item.email, item.role, item.isActive ? "ativo" : "inativo"]
                  .filter(Boolean)
                  .join(" ")
              ),
            });
          });

          snapshot.logs.forEach((item: any) => {
            entries.push({
              module: "auditoria",
              path: "/logs",
              title: item.module,
              line: `${item.module} | ${item.action} | ${item.userName || "sistema"}`,
              searchable: normalizeAssistantText(
                [item.module, item.action, item.userName, item.userEmail]
                  .filter(Boolean)
                  .join(" ")
              ),
            });
          });
        }

        const normalizedTerms =
          keywords.length > 0 ? keywords : normalizedQuestion.split(/[^a-z0-9]+/).filter(Boolean);

        const matches = entries.filter(entry =>
          normalizedTerms.some(term => term.length >= 3 && entry.searchable.includes(term))
        );

        if (matches.length > 0) {
          const grouped = new Map<string, AssistantSearchEntry[]>();
          for (const item of matches.slice(0, 30)) {
            if (!grouped.has(item.module)) grouped.set(item.module, []);
            grouped.get(item.module)?.push(item);
          }

          const sections = Array.from(grouped.entries()).map(([module, items]) => ({
            title: module,
            lines: items.slice(0, 5).map(item => item.line),
          }));

          const highlights = Array.from(grouped.entries()).map(
            ([module, items]) => `${module}: ${items.length} resultado(s)`
          );

          const firstPath = matches[0]?.path || "/dashboard";

          return {
            answer: [
              `Encontrei ${matches.length} resultado(s) no sistema para sua pergunta.`,
              "",
              "Organizei por módulo para facilitar a leitura rápida no chat.",
            ].join("\n"),
            module: "geral",
            confidence: "alta",
            highlights,
            sections,
            actions: [
              { type: "navigate", label: "Abrir módulo mais relevante", path: firstPath },
            ],
            results: {},
          };
        }

        return {
          answer:
            [
              "Posso responder direto no chat e consultar o banco em todos os módulos principais.",
              "",
              "Tente perguntas como:",
              "- Quais solicitações estão no financeiro há mais de 3 dias?",
              "- Mostre itens de inventário sem responsável",
              "- Há chamados urgentes de manutenção?",
              "- Me dê uma visão geral do sistema",
              "- Quantas salas estão em uso agora?",
              "- Como estão os fornecedores por unidade?",
            ].join("\n"),
          module: "geral",
          confidence: "baixa",
          actions: [
            { type: "navigate", label: "Abrir Dashboard", path: "/dashboard" },
            {
              type: "navigate",
              label: "Abrir Solicitação de Compras",
              path: "/purchase-requests",
            },
            { type: "navigate", label: "Abrir Inventário", path: "/inventory" },
          ],
          results: {},
        };
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

  auditLogs: router({
    list: adminProcedure
      .input(
        z
          .object({
            userId: z.number().optional(),
            module: z.string().optional(),
            action: z
              .enum(["create", "read", "update", "delete", "login", "logout"])
              .optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            limit: z.number().min(1).max(500).optional(),
            offset: z.number().min(0).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (input?.startDate) {
          const parsedStart = parseMaskedDate(input.startDate);
          if (!parsedStart) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Data inicial inválida. Use DD-MM-YYYY",
            });
          }

          startDate = new Date(parsedStart);
          startDate.setHours(0, 0, 0, 0);
        }

        if (input?.endDate) {
          const parsedEnd = parseMaskedDate(input.endDate);
          if (!parsedEnd) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Data final inválida. Use DD-MM-YYYY",
            });
          }

          endDate = new Date(parsedEnd);
          endDate.setHours(23, 59, 59, 999);
        }

        return db.listAuditLogsDetailed({
          userId: input?.userId,
          module: input?.module,
          action: input?.action,
          startDate,
          endDate,
          limit: input?.limit ?? 200,
          offset: input?.offset ?? 0,
        });
      }),

    listModules: adminProcedure.query(async () => {
      return db.listAuditModules();
    }),

    listUsers: adminProcedure.query(async () => {
      const users = await db.listUsers();
      return users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      }));
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
