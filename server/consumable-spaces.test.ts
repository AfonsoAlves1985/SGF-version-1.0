import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Consumable Spaces", () => {
  let spaceId: number;
  let consumableId: number | null = null;

  beforeAll(async () => {
    // Create a test space
    const spaceResult = await db.createConsumableSpace({
      name: "Unidade Teste",
      description: "Unidade de teste para consumíveis",
      location: "Belém",
    });

    const spaces = await db.listConsumableSpaces();
    const createdSpace = spaces.find((space: any) => space.name === "Unidade Teste");
    if (!createdSpace) {
      throw new Error("Failed to create test consumable space");
    }
    spaceId = createdSpace.id;
  });

  afterAll(async () => {
    // Cleanup
    if (consumableId) {
      try {
        await db.deleteConsumableWithSpace(consumableId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (spaceId) {
      try {
        await db.deleteConsumableSpace(spaceId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it("should list all consumable spaces", async () => {
    const spaces = await db.listConsumableSpaces();
    expect(Array.isArray(spaces)).toBe(true);
  });

  it("should create a consumable space", async () => {
    const result = await db.createConsumableSpace({
      name: "Cozinha Principal",
      description: "Cozinha da unidade principal",
      location: "Andar 1",
    });
    expect(result).toBeDefined();
  });

  it("should update a consumable space", async () => {
    const result = await db.updateConsumableSpace(spaceId, {
      name: "Unidade Teste Atualizada",
      description: "Descrição atualizada",
    });
    expect(result).toBeDefined();
  });

  it("should create a consumable with space", async () => {
    const result = await db.createConsumableWithSpace({
      spaceId,
      name: "Açúcar",
      category: "COZINHA",
      unit: "KG",
      minStock: 5,
      maxStock: 20,
      currentStock: 10,
      replenishStock: 0,
    });
    const consumables = await db.listConsumablesWithSpace({ spaceId, search: "Açúcar" });
    const createdConsumable = consumables.find((consumable: any) => consumable.name === "Açúcar");
    if (!createdConsumable) {
      throw new Error("Failed to create test consumable");
    }
    consumableId = createdConsumable.id;
    expect(result).toBeDefined();
  });

  it("should list consumables with space filter", async () => {
    const consumables = await db.listConsumablesWithSpace({
      spaceId,
    });
    expect(Array.isArray(consumables)).toBe(true);
  });

  it("should calculate status ESTOQUE_OK for consumable", async () => {
    const consumables = await db.listConsumablesWithSpace({
      spaceId,
    });
    const consumable = consumables.find((c: any) => c.name === "Açúcar");
    expect(consumable?.status).toBe("ESTOQUE_OK");
  });

  it("should create consumable with REPOR_ESTOQUE status", async () => {
    const result = await db.createConsumableWithSpace({
      spaceId,
      name: "Café",
      category: "COZINHA",
      unit: "KG",
      minStock: 5,
      maxStock: 20,
      currentStock: 2,
      replenishStock: 0,
      status: "REPOR_ESTOQUE",
    });
    const consumables = await db.listConsumablesWithSpace({ spaceId, search: "Café" });
    const cafe = consumables.find((consumable: any) => consumable.name === "Café");
    const cafeId = cafe?.id;
    expect(result).toBeDefined();
    if (cafeId) {
      await db.deleteConsumableWithSpace(cafeId);
    }
  });

  it("should create consumable with ACIMA_DO_ESTOQUE status", async () => {
    const result = await db.createConsumableWithSpace({
      spaceId,
      name: "Sal",
      category: "COZINHA",
      unit: "KG",
      minStock: 5,
      maxStock: 20,
      currentStock: 25,
      replenishStock: 0,
      status: "ACIMA_DO_ESTOQUE",
    });
    const consumables = await db.listConsumablesWithSpace({ spaceId, search: "Sal" });
    const sal = consumables.find((consumable: any) => consumable.name === "Sal");
    const salId = sal?.id;
    expect(result).toBeDefined();
    if (salId) {
      await db.deleteConsumableWithSpace(salId);
    }
  });

  it("should update consumable with space", async () => {
    if (!consumableId) {
      throw new Error("Consumable test fixture was not created");
    }

    const result = await db.updateConsumableWithSpace(consumableId, {
      currentStock: 15,
      name: "Açúcar Refinado",
    });
    expect(result).toBeDefined();
  });

  it("should search consumables by name", async () => {
    const consumables = await db.listConsumablesWithSpace({
      spaceId,
      search: "Açúcar",
    });
    expect(Array.isArray(consumables)).toBe(true);
    expect(consumables.length).toBeGreaterThan(0);
  });

  it("should filter consumables by category", async () => {
    const consumables = await db.listConsumablesWithSpace({
      spaceId,
      category: "COZINHA",
    });
    expect(Array.isArray(consumables)).toBe(true);
  });

  it("should delete consumable with space", async () => {
    if (consumableId) {
      const result = await db.deleteConsumableWithSpace(consumableId);
      expect(result).toBeDefined();
      consumableId = null;
    }
  });
});
