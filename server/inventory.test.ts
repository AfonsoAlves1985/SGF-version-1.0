import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Inventory Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it(
    "should create an inventory item",
    async () => {
    const result = await caller.inventory.create({
      name: "Papel A4",
      category: "Consumíveis",
      quantity: 100,
      minQuantity: 20,
      unit: "resma",
      location: "Armazém A",
    });

    expect(result).toBeDefined();
    },
    20000
  );

  it("should list inventory items", async () => {
    const result = await caller.inventory.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter inventory by category", async () => {
    const result = await caller.inventory.list({
      category: "Consumíveis",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Teams Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create a team member", async () => {
    const result = await caller.teams.create({
      name: "João Silva",
      email: "joao@example.com",
      phone: "912345678",
      role: "limpeza",
      sector: "Piso 1",
    });

    expect(result).toBeDefined();
  });

  it("should list team members", async () => {
    const result = await caller.teams.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter teams by role", async () => {
    const result = await caller.teams.list({
      role: "limpeza",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Maintenance Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create a maintenance request", async () => {
    let spaces = await caller.maintenanceSpaces.list();
    if (spaces.length === 0) {
      await caller.maintenanceSpaces.create({
        name: "Espaco de Teste",
        description: "Criado automaticamente para testes",
      });
      spaces = await caller.maintenanceSpaces.list();
    }

    const result = await caller.maintenance.create({
      title: "Reparação de ar condicionado",
      description: "Ar condicionado não funciona na sala 101",
      priority: "alta",
      type: "correctiva",
      spaceId: spaces[0].id,
    });

    expect(result).toBeDefined();
  });

  it("should list maintenance requests", async () => {
    const result = await caller.maintenance.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter maintenance by priority", async () => {
    const result = await caller.maintenance.list({
      priority: "urgente",
    });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter maintenance by status", async () => {
    const result = await caller.maintenance.list({
      status: "aberto",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Rooms Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create a room", async () => {
    const result = await caller.rooms.create({
      name: "Sala de Reuniões A",
      capacity: 10,
      location: "Piso 2",
      type: "sala",
    });

    expect(result).toBeDefined();
  });

  it("should list rooms", async () => {
    const result = await caller.rooms.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter rooms by type", async () => {
    const result = await caller.rooms.list({
      type: "sala",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Suppliers Router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should create a supplier", async () => {
    const result = await caller.suppliers.create({
      companyName: "Fornecedor de Limpeza XYZ",
      serviceTypes: ["Limpeza"],
      contact: "contato@fornecedor.com",
      contactPerson: "Equipe Comercial",
      status: "ativo",
      notes: "Fornecedor de teste",
    });

    expect(result).toBeDefined();
  });

  it("should list suppliers", async () => {
    const result = await caller.suppliers.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter suppliers by category", async () => {
    const result = await caller.suppliers.list({
      category: "Limpeza",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
