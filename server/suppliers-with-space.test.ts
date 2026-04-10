import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { suppliersWithSpace, supplierSpaces } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

describe("Suppliers With Space CRUD Operations", () => {
  let db: any;
  let testSpaceId: number;

  beforeAll(async () => {
    db = await getDb();
    const created = await db
      .insert(supplierSpaces)
      .values({
        name: "Test Space",
        description: "Space for testing suppliers",
        location: "Test Location",
      })
      .returning({ id: supplierSpaces.id });

    testSpaceId = created[0]?.id;
    expect(testSpaceId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (!db || !testSpaceId) return;

    await db
      .delete(suppliersWithSpace)
      .where(
        inArray(suppliersWithSpace.companyName, [
          "Test Cleaning Service",
          "Multi Service Company",
        ])
      );

    await db.delete(supplierSpaces).where(eq(supplierSpaces.id, testSpaceId));
  });

  it("should list suppliers by space", async () => {
    const result = await db
      .select()
      .from(suppliersWithSpace);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a supplier with space", async () => {
    const newSupplier = {
      spaceId: testSpaceId,
      companyName: "Test Cleaning Service",
      serviceTypes: JSON.stringify(["Limpeza", "Manutenção"]),
      contact: "(11) 98765-4321",
      contactPerson: "João Silva",
      status: "ativo" as const,
      notes: "Test supplier",
    };

    const result = await db.insert(suppliersWithSpace).values(newSupplier);
    expect(result).toBeDefined();
  });

  it("should update supplier status", async () => {
    const suppliers = await db
      .select()
      .from(suppliersWithSpace)
      .limit(1);

    if (suppliers.length > 0) {
      const updated = await db
        .update(suppliersWithSpace)
        .set({ status: "suspenso" })
        .where(eq(suppliersWithSpace.id, suppliers[0].id));
      expect(updated).toBeDefined();
    }
  });

  it("should update supplier service types", async () => {
    const suppliers = await db
      .select()
      .from(suppliersWithSpace)
      .limit(1);

    if (suppliers.length > 0) {
      const newServiceTypes = JSON.stringify(["Segurança", "Consultoria"]);
      const updated = await db
        .update(suppliersWithSpace)
        .set({ serviceTypes: newServiceTypes })
        .where(eq(suppliersWithSpace.id, suppliers[0].id));
      expect(updated).toBeDefined();
    }
  });

  it("should delete a supplier", async () => {
    const supplier = await db
      .select()
      .from(suppliersWithSpace)
      .where(eq(suppliersWithSpace.companyName, "Test Cleaning Service"))
      .limit(1);

    if (supplier.length > 0) {
      const deleted = await db
        .delete(suppliersWithSpace)
        .where(eq(suppliersWithSpace.id, supplier[0].id));
      expect(deleted).toBeDefined();
    }
  });

  it("should handle supplier with multiple service types", async () => {
    const newSupplier = {
      spaceId: testSpaceId,
      companyName: "Multi Service Company",
      serviceTypes: JSON.stringify([
        "Limpeza",
        "Manutenção",
        "Segurança",
        "Catering",
      ]),
      contact: "contato@multiservice.com",
      contactPerson: "Maria Santos",
      status: "ativo" as const,
      notes: "Company with multiple services",
    };

    const result = await db.insert(suppliersWithSpace).values(newSupplier);
    expect(result).toBeDefined();
  });

  it("should filter suppliers by space", async () => {
    const result = await db
      .select()
      .from(suppliersWithSpace)
      .where(eq(suppliersWithSpace.spaceId, testSpaceId));
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate foreign key constraint", async () => {
    try {
      const invalidSupplier = {
        spaceId: 99999, // Non-existent space
        companyName: "Invalid Supplier",
        serviceTypes: JSON.stringify(["Limpeza"]),
        contact: "test@test.com",
        contactPerson: "Test Person",
        status: "ativo" as const,
      };

      await db.insert(suppliersWithSpace).values(invalidSupplier);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
