import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import * as db from "../db";
import { extractToken, verifyToken } from "../auth.helpers";

type User = NonNullable<Awaited<ReturnType<typeof db.getUserById>>>;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getUserFromRequest(
  req: CreateExpressContextOptions["req"],
): Promise<User | null> {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;

  const token = extractToken(authHeader);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await db.getUserById(decoded.userId);
  if (!user || !user.isActive) return null;

  return user;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await getUserFromRequest(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
