import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { InsertTeam } from "../drizzle/schema";

describe("Teams CRUD Operations", () => {
  let createdTeamId: number | null = null;

  beforeAll(async () => {
    // Ensure database is available
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      throw new Error("Database not available for tests");
    }
  });

  it("should create a new team member", async () => {
    const teamData: InsertTeam = {
      name: "João Silva",
      email: "joao@example.com",
      phone: "+351 912345678",
      role: "limpeza",
      sector: "Piso 1",
    };

    const result = await db.createTeam(teamData);
    expect(result).toBeDefined();
    
    // Get the created team to verify
    const teams = await db.listTeams();
    const createdTeam = teams.find((t: any) => t.name === "João Silva");
    expect(createdTeam).toBeDefined();
    expect(createdTeam?.email).toBe("joao@example.com");
    expect(createdTeam?.role).toBe("limpeza");
    
    createdTeamId = createdTeam?.id;
  });

  it("should list all team members", async () => {
    const teams = await db.listTeams();
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
  });

  it("should filter teams by role", async () => {
    const cleaningTeams = await db.listTeams({ role: "limpeza" });
    expect(Array.isArray(cleaningTeams)).toBe(true);
    
    // All should have role "limpeza"
    cleaningTeams.forEach((team: any) => {
      expect(team.role).toBe("limpeza");
    });
  });

  it("should filter teams by status", async () => {
    const activeTeams = await db.listTeams({ status: "ativo" });
    expect(Array.isArray(activeTeams)).toBe(true);
    
    // All should have status "ativo"
    activeTeams.forEach((team: any) => {
      expect(team.status).toBe("ativo");
    });
  });

  it("should get a team by ID", async () => {
    if (!createdTeamId) {
      throw new Error("No team created for this test");
    }

    const team = await db.getTeamById(createdTeamId);
    expect(team).toBeDefined();
    expect(team?.id).toBe(createdTeamId);
    expect(team?.name).toBe("João Silva");
  });

  it("should update a team member", async () => {
    if (!createdTeamId) {
      throw new Error("No team created for this test");
    }

    const updateData = {
      email: "joao.silva@example.com",
      phone: "+351 987654321",
      sector: "Piso 2",
    };

    await db.updateTeam(createdTeamId, updateData);

    const updatedTeam = await db.getTeamById(createdTeamId);
    expect(updatedTeam?.email).toBe("joao.silva@example.com");
    expect(updatedTeam?.phone).toBe("+351 987654321");
    expect(updatedTeam?.sector).toBe("Piso 2");
  });

  it("should update team status to inactive", async () => {
    if (!createdTeamId) {
      throw new Error("No team created for this test");
    }

    await db.updateTeam(createdTeamId, { status: "inativo" });

    const updatedTeam = await db.getTeamById(createdTeamId);
    expect(updatedTeam?.status).toBe("inativo");
  });

  it("should change team role", async () => {
    if (!createdTeamId) {
      throw new Error("No team created for this test");
    }

    await db.updateTeam(createdTeamId, { role: "manutencao" });

    const updatedTeam = await db.getTeamById(createdTeamId);
    expect(updatedTeam?.role).toBe("manutencao");
  });

  it("should delete a team member", async () => {
    if (!createdTeamId) {
      throw new Error("No team created for this test");
    }

    await db.deleteTeam(createdTeamId);

    const deletedTeam = await db.getTeamById(createdTeamId);
    expect(deletedTeam).toBeNull();
  });

  it("should handle creating team with minimal data", async () => {
    const minimalTeamData: InsertTeam = {
      name: "Maria Santos",
      role: "admin",
    };

    const result = await db.createTeam(minimalTeamData);
    expect(result).toBeDefined();

    const teams = await db.listTeams();
    const createdTeam = teams.find((t: any) => t.name === "Maria Santos");
    expect(createdTeam).toBeDefined();
    expect(createdTeam?.email).toBeNull();
    expect(createdTeam?.phone).toBeNull();
  });

  it("should validate team roles", async () => {
    const validRoles = ["limpeza", "manutencao", "admin"];
    const teams = await db.listTeams();

    teams.forEach((team: any) => {
      expect(validRoles).toContain(team.role);
    });
  });

  it("should validate team status", async () => {
    const validStatuses = ["ativo", "inativo"];
    const teams = await db.listTeams();

    teams.forEach((team: any) => {
      expect(validStatuses).toContain(team.status);
    });
  });
});
