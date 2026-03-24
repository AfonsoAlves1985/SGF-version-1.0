import { describe, it, expect, beforeEach, vi } from "vitest";
import * as sync from "./consumable-sync";
import * as db from "./db";

// Mock das funções do db
vi.mock("./db", () => ({
  getConsumableWeeklyMovements: vi.fn(),
  getConsumableMonthlyMovements: vi.fn(),
  updateConsumableWithSpace: vi.fn(),
  updateConsumableWeeklyMovement: vi.fn(),
  updateConsumableMonthlyMovement: vi.fn(),
  createConsumableMonthlyMovement: vi.fn(),
  listConsumablesWithSpace: vi.fn(),
}));

describe("Consumable Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncWeeklyToBase", () => {
    it("deve sincronizar movimentações semanais com a tabela base", async () => {
      const mockWeeklyMovements = [
        {
          id: 1,
          consumableId: 1,
          spaceId: 1,
          weekStartDate: new Date("2026-03-16"),
          weekNumber: 11,
          year: 2026,
          mondayStock: 10,
          tuesdayStock: 9,
          wednesdayStock: 8,
          thursdayStock: 7,
          fridayStock: 6,
          saturdayStock: 5,
          sundayStock: 4,
          totalMovement: 49,
          status: "ESTOQUE_OK",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue(mockWeeklyMovements);

      await sync.syncWeeklyToBase(1, 1);

      expect(db.updateConsumableWithSpace).toHaveBeenCalledWith(1, {
        currentStock: 49,
      });
    });

    it("deve retornar se não houver movimentações semanais", async () => {
      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue([]);

      await sync.syncWeeklyToBase(1, 1);

      expect(db.updateConsumableWithSpace).not.toHaveBeenCalled();
    });
  });

  describe("syncMonthlyToWeekly", () => {
    it("deve sincronizar movimentações mensais com as semanais", async () => {
      const mockWeeklyMovements = [
        {
          id: 1,
          weekStartDate: new Date("2026-03-02"),
          totalMovement: 50,
        },
        {
          id: 2,
          weekStartDate: new Date("2026-03-09"),
          totalMovement: 45,
        },
        {
          id: 3,
          weekStartDate: new Date("2026-03-16"),
          totalMovement: 40,
        },
      ];

      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue(mockWeeklyMovements);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue([]);

      await sync.syncMonthlyToWeekly(1, 1, 3, 2026);

      expect(db.createConsumableMonthlyMovement).toHaveBeenCalled();
      const call = vi.mocked(db.createConsumableMonthlyMovement).mock.calls[0][0];
      expect(call.totalMovement).toBe(135);
      expect(call.averageStock).toBe(45);
    });

    it("deve atualizar movimentação mensal existente", async () => {
      const mockWeeklyMovements = [
        {
          id: 1,
          weekStartDate: new Date("2026-03-02"),
          totalMovement: 50,
        },
        {
          id: 2,
          weekStartDate: new Date("2026-03-09"),
          totalMovement: 45,
        },
      ];

      const mockMonthlyMovements = [
        {
          id: 1,
          month: 3,
          year: 2026,
          totalMovement: 0,
        },
      ];

      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue(mockWeeklyMovements);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue(mockMonthlyMovements);

      await sync.syncMonthlyToWeekly(1, 1, 3, 2026);

      expect(db.updateConsumableMonthlyMovement).toHaveBeenCalledWith(1, {
        totalMovement: 95,
        averageStock: 48,
      });
    });
  });

  describe("updateConsumableStatus", () => {
    it("deve atualizar status para REPOR_ESTOQUE quando abaixo do mínimo", async () => {
      const mockConsumables = [
        {
          id: 1,
          currentStock: 2,
          minStock: 5,
          maxStock: 20,
        },
      ];

      vi.mocked(db.listConsumablesWithSpace).mockResolvedValue(mockConsumables);
      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue([]);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue([]);

      await sync.updateConsumableStatus(1, 1);

      expect(db.updateConsumableWithSpace).toHaveBeenCalledWith(1, {
        status: "REPOR_ESTOQUE",
      });
    });

    it("deve atualizar status para ACIMA_DO_ESTOQUE quando acima do máximo", async () => {
      const mockConsumables = [
        {
          id: 1,
          currentStock: 25,
          minStock: 5,
          maxStock: 20,
        },
      ];

      vi.mocked(db.listConsumablesWithSpace).mockResolvedValue(mockConsumables);
      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue([]);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue([]);

      await sync.updateConsumableStatus(1, 1);

      expect(db.updateConsumableWithSpace).toHaveBeenCalledWith(1, {
        status: "ACIMA_DO_ESTOQUE",
      });
    });

    it("deve manter status ESTOQUE_OK quando dentro dos limites", async () => {
      const mockConsumables = [
        {
          id: 1,
          currentStock: 10,
          minStock: 5,
          maxStock: 20,
        },
      ];

      vi.mocked(db.listConsumablesWithSpace).mockResolvedValue(mockConsumables);
      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue([]);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue([]);

      await sync.updateConsumableStatus(1, 1);

      expect(db.updateConsumableWithSpace).toHaveBeenCalledWith(1, {
        status: "ESTOQUE_OK",
      });
    });

    it("deve retornar se consumível não existir", async () => {
      vi.mocked(db.listConsumablesWithSpace).mockResolvedValue([]);

      await sync.updateConsumableStatus(1, 1);

      expect(db.updateConsumableWithSpace).not.toHaveBeenCalled();
    });
  });

  describe("fullSync", () => {
    it("deve executar sincronização completa", async () => {
      const mockConsumables = [
        {
          id: 1,
          currentStock: 10,
          minStock: 5,
          maxStock: 20,
        },
      ];

      vi.mocked(db.getConsumableWeeklyMovements).mockResolvedValue([
        {
          id: 1,
          totalMovement: 10,
        },
      ]);
      vi.mocked(db.getConsumableMonthlyMovements).mockResolvedValue([]);
      vi.mocked(db.listConsumablesWithSpace).mockResolvedValue(mockConsumables);

      await sync.fullSync(1, 1);

      expect(db.updateConsumableWithSpace).toHaveBeenCalled();
    });
  });
});
