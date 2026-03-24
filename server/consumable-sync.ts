import * as db from "./db";

/**
 * Sincroniza movimentações semanais com a tabela base de consumíveis
 * Atualiza o estoque atual baseado na soma das movimentações da semana
 */
export async function syncWeeklyToBase(consumableId: number, spaceId: number) {
  const weeklyMovements = await db.getConsumableWeeklyMovements(spaceId, consumableId);
  
  if (weeklyMovements.length === 0) return;

  // Pega a movimentação mais recente
  const latestWeekly = weeklyMovements[0];
  const totalWeeklyMovement = latestWeekly.totalMovement || 0;

  // Atualiza o consumível base com o total da semana
  await db.updateConsumableWithSpace(consumableId, {
    currentStock: totalWeeklyMovement,
  });
}

/**
 * Sincroniza movimentações mensais com as movimentações semanais
 * Calcula a média e total do mês baseado nas semanas
 */
export async function syncMonthlyToWeekly(consumableId: number, spaceId: number, month: number, year: number) {
  const weeklyMovements = await db.getConsumableWeeklyMovements(spaceId, consumableId);
  
  // Filtra movimentações do mês especificado
  const monthlyWeeklyMovements = weeklyMovements.filter((w: any) => {
    const weekDate = new Date(w.weekStartDate);
    return weekDate.getMonth() + 1 === month && weekDate.getFullYear() === year;
  });

  if (monthlyWeeklyMovements.length === 0) return;

  // Calcula totais
  const totalMovement = monthlyWeeklyMovements.reduce((sum: number, w: any) => sum + (w.totalMovement || 0), 0);
  const averageStock = Math.round(totalMovement / monthlyWeeklyMovements.length);

  // Atualiza ou cria movimentação mensal
  const existingMonthly = await db.getConsumableMonthlyMovements(spaceId, consumableId);
  const monthlyRecord = existingMonthly.find((m: any) => m.month === month && m.year === year);

  if (monthlyRecord) {
    await db.updateConsumableMonthlyMovement(monthlyRecord.id, {
      totalMovement,
      averageStock,
    });
  } else {
    const monthStartDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    await db.createConsumableMonthlyMovement({
      consumableId,
      spaceId,
      monthStartDate: new Date(monthStartDate),
      month,
      year,
      week1Stock: monthlyWeeklyMovements[0]?.totalMovement || 0,
      week2Stock: monthlyWeeklyMovements[1]?.totalMovement || 0,
      week3Stock: monthlyWeeklyMovements[2]?.totalMovement || 0,
      week4Stock: monthlyWeeklyMovements[3]?.totalMovement || 0,
      week5Stock: monthlyWeeklyMovements[4]?.totalMovement || 0,
      totalMovement,
      averageStock,
    });
  }
}

/**
 * Calcula e atualiza o status de um consumível baseado no estoque atual
 */
export async function updateConsumableStatus(consumableId: number, spaceId: number) {
  const consumables = await db.listConsumablesWithSpace({ spaceId });
  const consumable = consumables.find((c: any) => c.id === consumableId);
  
  if (!consumable) return;

  let status: "ESTOQUE_OK" | "ACIMA_DO_ESTOQUE" | "REPOR_ESTOQUE" = "ESTOQUE_OK";
  
  if (consumable.currentStock <= consumable.minStock) {
    status = "REPOR_ESTOQUE";
  } else if (consumable.currentStock >= consumable.maxStock) {
    status = "ACIMA_DO_ESTOQUE";
  }

  // Atualiza o consumível
  await db.updateConsumableWithSpace(consumableId, { status });

  // Atualiza todas as movimentações semanais e mensais
  const weeklyMovements = await db.getConsumableWeeklyMovements(spaceId, consumableId);
  for (const weekly of weeklyMovements) {
    await db.updateConsumableWeeklyMovement(weekly.id, { status });
  }

  const monthlyMovements = await db.getConsumableMonthlyMovements(spaceId, consumableId);
  for (const monthly of monthlyMovements) {
    await db.updateConsumableMonthlyMovement(monthly.id, { status });
  }
}

/**
 * Sincronização completa: atualiza base -> semanais -> mensais
 */
export async function fullSync(consumableId: number, spaceId: number) {
  // 1. Sincroniza semanais com base
  await syncWeeklyToBase(consumableId, spaceId);

  // 2. Sincroniza mensais com semanais (para todos os meses)
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const month = ((today.getMonth() - i + 12) % 12) + 1;
    const year = today.getFullYear() - Math.floor((today.getMonth() - i + 12) / 12);
    await syncMonthlyToWeekly(consumableId, spaceId, month, year);
  }

  // 3. Atualiza status
  await updateConsumableStatus(consumableId, spaceId);
}
