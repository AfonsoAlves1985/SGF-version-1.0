import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "superadmin" | "admin" | "editor" | "viewer" | "user";
  loginMethod: string | null;
  isActive: number;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User;
};

const defaultUser: User = {
  id: 1,
  openId: "local-admin",
  name: "Admin",
  email: "admin@local.com",
  role: "admin",
  loginMethod: "local",
  isActive: 1,
  lastLogin: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSignedIn: new Date().toISOString(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: defaultUser,
  };
}
