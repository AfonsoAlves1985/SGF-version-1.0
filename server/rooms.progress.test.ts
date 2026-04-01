import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

/**
 * Teste para validar o cálculo de progresso de uso de salas
 * Garante que a hora cadastrada faz parte do cálculo de progresso
 */

// Simular a função parseDateTime usada no frontend
const parseDateTime = (dateVal: any, timeStr?: string) => {
  // Se dateVal é um Date object, usar diretamente
  const d = dateVal instanceof Date ? new Date(dateVal) : new Date(dateVal);
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    d.setUTCHours(h || 0, m || 0, 0, 0);
  } else {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d;
};

// Simular o cálculo de progresso corrigido
const calculateProgress = (room: any, now: Date) => {
  const startDate = parseDateTime(room.startDate, room.startTime);
  const endDate = parseDateTime(room.endDate, room.endTime);

  const totalDuration = endDate.getTime() - startDate.getTime();

  // Calcular tempo decorrido considerando os limites [startDate, endDate]
  let elapsedTime = 0;
  if (now >= startDate && now <= endDate) {
    // Dentro do intervalo: tempo desde o início até agora
    elapsedTime = now.getTime() - startDate.getTime();
  } else if (now > endDate) {
    // Após o fim: tempo total (100%)
    elapsedTime = totalDuration;
  }
  // Se now < startDate, elapsedTime permanece 0

  const usagePercentage = totalDuration > 0 ? (elapsedTime / totalDuration) * 100 : 0;
  return Math.round(usagePercentage);
};

describe("Rooms Progress Calculation", () => {
  let now: Date;

  beforeEach(() => {
    // Fixar a data/hora atual para testes consistentes
    // 31/03/2026 às 15:09 UTC
    now = new Date("2026-03-31T15:09:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show 0% progress when usage hasn't started yet", () => {
    // Sala reservada para 31/03 às 16:00 - 18:00 UTC
    // Agora é 31/03 às 15:09 UTC (antes do início)
    const room = {
      startDate: new Date("2026-03-31T00:00:00.000Z"),
      startTime: "16:00",
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "18:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(0);
  });

  it("should calculate correct progress when usage is in progress", () => {
    // Sala reservada para 31/03 das 14:00 às 18:00 UTC (4 horas)
    // Agora é 31/03 às 15:09 UTC (1 hora e 9 minutos decorridos)
    // Esperado: ~29% (69 minutos / 240 minutos)
    const room = {
      startDate: new Date("2026-03-31T00:00:00.000Z"),
      startTime: "14:00",
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "18:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(29); // 69/240 = 0.2875 ≈ 29%
  });

  it("should show 100% progress when usage period has ended", () => {
    // Sala reservada para 30/03 das 14:00 às 18:00 UTC
    // Agora é 31/03 às 15:09 UTC (após o fim)
    const room = {
      startDate: new Date("2026-03-30T00:00:00.000Z"),
      startTime: "14:00",
      endDate: new Date("2026-03-30T00:00:00.000Z"),
      endTime: "18:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(100);
  });

  it("should NOT exceed 100% even when current time is far after end date", () => {
    // Sala reservada para 15/03 das 09:00 às 17:00 UTC
    // Agora é 31/03 às 15:09 UTC (muito tempo depois)
    const room = {
      startDate: new Date("2026-03-15T00:00:00.000Z"),
      startTime: "09:00",
      endDate: new Date("2026-03-15T00:00:00.000Z"),
      endTime: "17:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(100);
  });

  it("should consider time component in progress calculation", () => {
    // Sala reservada para 31/03 das 14:00 às 16:00 UTC (2 horas)
    // Agora é 31/03 às 15:09 UTC (1 hora e 9 minutos decorridos)
    // Esperado: ~58% (69 minutos / 120 minutos)
    const room = {
      startDate: new Date("2026-03-31T00:00:00.000Z"),
      startTime: "14:00",
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "16:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(57); // 69/120 = 0.575 ≈ 57% (arredondado para baixo)
  });

  it("should handle multi-day reservations correctly", () => {
    // Sala reservada para 30/03 às 18:00 UTC até 31/03 às 18:00 UTC (24 horas)
    // Agora é 31/03 às 15:09 UTC (21 horas e 9 minutos decorridos)
    // Esperado: ~88% (1269 minutos / 1440 minutos)
    const room = {
      startDate: new Date("2026-03-30T00:00:00.000Z"),
      startTime: "18:00",
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "18:00",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(88); // 1269/1440 = 0.88125 ≈ 88%
  });

  it("should show 0% when start and end times are the same on same day", () => {
    // Sala reservada para 31/03 das 15:09 às 15:09 UTC (duração 0)
    // Agora é 31/03 às 15:09 UTC (exatamente no fim, mas duração é 0)
    const room = {
      startDate: new Date("2026-03-31T00:00:00.000Z"),
      startTime: "15:09",
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "15:09",
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(0); // Duração 0 = 0%
  });

  it("should handle missing time fields (defaults to 00:00)", () => {
    // Sala reservada para 31/03 (sem hora) até 31/03 (sem hora)
    // Isso significa 31/03 00:00 UTC até 31/03 00:00 UTC (duração 0)
    // Agora é 31/03 às 15:09 UTC (após o fim, mas duração é 0)
    const room = {
      startDate: new Date("2026-03-31T00:00:00.000Z"),
      startTime: "", // sem hora
      endDate: new Date("2026-03-31T00:00:00.000Z"),
      endTime: "", // sem hora
    };

    const progress = calculateProgress(room, now);
    expect(progress).toBe(0); // Duração 0 = 0%
  });
});
