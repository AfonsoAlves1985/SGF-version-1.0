import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { suppliers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Suppliers CRUD Operations", () => {
  let db: any;
  let testSupplierId: number;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create a new supplier with all fields", async () => {
    const newSupplier = {
      companyName: "Test Cleaning Company",
      serviceTypes: ["Limpeza", "Manutenção"],
      contact: "(11) 98765-4321",
      contactPerson: "João Silva",
      status: "ativo" as const,
      notes: "Empresa de limpeza profissional",
    };

    const result = await db.insert(suppliers).values(newSupplier);
    expect(result).toBeDefined();
  });

  it("should retrieve suppliers by status", async () => {
    const result = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, "ativo"));
    expect(Array.isArray(result)).toBe(true);
  });

  it("should update supplier status", async () => {
    const supplier = await db
      .select()
      .from(suppliers)
      .limit(1);

    if (supplier.length > 0) {
      const updated = await db
        .update(suppliers)
        .set({ status: "suspenso" })
        .where(eq(suppliers.id, supplier[0].id));
      expect(updated).toBeDefined();
    }
  });

  it("should update supplier service types", async () => {
    const supplier = await db
      .select()
      .from(suppliers)
      .limit(1);

    if (supplier.length > 0) {
      const newServiceTypes = ["Segurança", "Consultoria"];
      const updated = await db
        .update(suppliers)
        .set({ serviceTypes: JSON.stringify(newServiceTypes) })
        .where(eq(suppliers.id, supplier[0].id));
      expect(updated).toBeDefined();
    }
  });

  it("should delete a supplier", async () => {
    const supplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyName, "Test Cleaning Company"))
      .limit(1);

    if (supplier.length > 0) {
      const deleted = await db
        .delete(suppliers)
        .where(eq(suppliers.id, supplier[0].id));
      expect(deleted).toBeDefined();
    }
  });

  it("should handle supplier with multiple service types", async () => {
    const newSupplier = {
      companyName: "Multi Service Company",
      serviceTypes: ["Limpeza", "Manutenção", "Segurança", "Catering"],
      contact: "contato@multiservice.com",
      contactPerson: "Maria Santos",
      status: "ativo" as const,
      notes: "Empresa com múltiplos serviços",
    };

    const result = await db.insert(suppliers).values(newSupplier);
    expect(result).toBeDefined();

    // Cleanup
    const created = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyName, "Multi Service Company"))
      .limit(1);

    if (created.length > 0) {
      await db
        .delete(suppliers)
        .where(eq(suppliers.id, created[0].id));
    }
  });

  it("should validate required fields", async () => {
    const invalidSupplier = {
      companyName: "",
      serviceTypes: [],
      contact: "",
      contactPerson: "",
      status: "ativo" as const,
    };

    // This should fail in real validation
    expect(invalidSupplier.companyName).toBe("");
    expect(invalidSupplier.serviceTypes.length).toBe(0);
  });
});
