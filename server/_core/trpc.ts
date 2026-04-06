import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { canEdit, isAdmin } from "../auth.helpers";
import * as db from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

function resolveAuditAction(procedureName: string) {
  const name = procedureName.toLowerCase();

  if (name === "login") return "login" as const;
  if (name === "logout") return "logout" as const;

  if (
    name.startsWith("create") ||
    name.startsWith("invite") ||
    name.includes("invite")
  ) {
    return "create" as const;
  }

  if (
    name.startsWith("update") ||
    name.startsWith("accept") ||
    name.startsWith("revoke") ||
    name.startsWith("activate") ||
    name.startsWith("deactivate") ||
    name.startsWith("set")
  ) {
    return "update" as const;
  }

  if (name.startsWith("delete") || name.startsWith("remove")) {
    return "delete" as const;
  }

  return null;
}

function toJsonSafe(value: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (item instanceof Date) return item.toISOString();
        if (typeof item === "bigint") return Number(item);
        return item;
      })
    );
  } catch {
    return { raw: String(value) };
  }
}

function getHeaderValue(
  headers: Record<string, unknown> | undefined,
  key: string
) {
  const header = headers?.[key];

  if (typeof header === "string") return header;
  if (Array.isArray(header) && typeof header[0] === "string") return header[0];
  return undefined;
}

function getRecordId(input: unknown) {
  if (!input || typeof input !== "object") return null;

  const withId = input as { id?: unknown; userId?: unknown; invitationId?: unknown };

  if (typeof withId.id === "number") return withId.id;
  if (typeof withId.userId === "number") return withId.userId;
  if (typeof withId.invitationId === "number") return withId.invitationId;

  return null;
}

function getRecordName(input: unknown) {
  if (!input || typeof input !== "object") return null;

  const data = input as {
    name?: unknown;
    title?: unknown;
    email?: unknown;
    companyName?: unknown;
    nrBem?: unknown;
    token?: unknown;
  };

  const candidates = [
    data.name,
    data.title,
    data.email,
    data.companyName,
    data.nrBem,
    data.token,
  ];

  for (const item of candidates) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim().slice(0, 255);
    }
  }

  return null;
}

async function writeAuditLog(params: {
  ctx: TrpcContext;
  path: string;
  input: unknown;
  status: "success" | "failed";
  errorMessage?: string;
}) {
  const user = params.ctx.user;
  if (!user) return;

  const [module = "unknown", procedureName = ""] = params.path.split(".");
  const action = resolveAuditAction(procedureName);
  if (!action) return;

  const forwardedFor = getHeaderValue(
    params.ctx.req.headers as Record<string, unknown>,
    "x-forwarded-for"
  );

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || params.ctx.req.ip || undefined;

  try {
    await db.createAuditLog({
      userId: user.id,
      action,
      module,
      recordId: getRecordId(params.input),
      recordName: getRecordName(params.input),
      changes: toJsonSafe(params.input) as any,
      ipAddress,
      userAgent: getHeaderValue(
        params.ctx.req.headers as Record<string, unknown>,
        "user-agent"
      ),
      status: params.status,
      errorMessage:
        params.errorMessage && params.errorMessage.length > 0
          ? params.errorMessage
          : null,
    });
  } catch {
    // não bloqueia o fluxo principal
  }
}

const auditMutations = t.middleware(async opts => {
  if (opts.type !== "mutation" || !opts.ctx.user) {
    return opts.next();
  }

  try {
    const result = await opts.next();

    await writeAuditLog({
      ctx: opts.ctx,
      path: opts.path,
      input: opts.input,
      status: "success",
    });

    return result;
  } catch (error: any) {
    await writeAuditLog({
      ctx: opts.ctx,
      path: opts.path,
      input: opts.input,
      status: "failed",
      errorMessage: error?.message || "Erro desconhecido",
    });

    throw error;
  }
});

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (!isAdmin(ctx.user.role as any)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requireEditor = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (!canEdit(ctx.user.role as any)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sem permissão para editar este recurso",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser).use(auditMutations);
export const editorProcedure = t.procedure.use(requireEditor).use(auditMutations);

export const adminProcedure = t.procedure.use(requireAdmin).use(auditMutations);
