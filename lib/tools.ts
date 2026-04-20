import { tool } from "ai";
import { z } from "zod";
import { loadAvailability } from "./data";
import {
  biggestDrops,
  biggestRises,
  compareHours,
  describeRange,
  findAnomalies,
  findNearest,
  hourlyAverage,
  rangeStats,
  topN,
} from "./stats";

function points() {
  return loadAvailability().points;
}

export const dataTools = {
  getValueAt: tool({
    description:
      "Devuelve el valor de la métrica (tiendas visibles) en un timestamp específico. Formato HH:MM o HH:MM:SS (hora de Colombia).",
    inputSchema: z.object({
      time: z.string().describe("Timestamp HH:MM o HH:MM:SS, ej: '10:30' o '16:01:10'"),
    }),
    execute: async ({ time }) => {
      const p = findNearest(points(), time);
      if (!p) return { error: "No se encontró valor" };
      return { time: p.t, value: p.v };
    },
  }),
  getRangeStats: tool({
    description:
      "Estadísticas (min, max, promedio, # de puntos) en un rango horario. Usar para preguntas como 'qué pasó entre las 10 y las 12'.",
    inputSchema: z.object({
      from: z.string().describe("Hora inicio HH:MM o HH:MM:SS"),
      to: z.string().describe("Hora fin HH:MM o HH:MM:SS"),
    }),
    execute: async ({ from, to }) => rangeStats(points(), from, to),
  }),
  getTopMoments: tool({
    description:
      "Devuelve los N momentos con mayor número de tiendas visibles del día.",
    inputSchema: z.object({
      n: z.number().int().min(1).max(20).default(5),
    }),
    execute: async ({ n }) => topN(points(), n),
  }),
  compareHoursTool: tool({
    description:
      "Compara dos horas específicas del día (ej: 10 vs 16) y devuelve diferencia de promedio, pico y valle.",
    inputSchema: z.object({
      hourA: z.string().describe("Hora A, ej '10'"),
      hourB: z.string().describe("Hora B, ej '16'"),
    }),
    execute: async ({ hourA, hourB }) => compareHours(points(), hourA, hourB),
  }),
  biggestDropsTool: tool({
    description:
      "Devuelve las N caídas más grandes entre puntos consecutivos (valor baja más bruscamente).",
    inputSchema: z.object({ n: z.number().int().min(1).max(20).default(5) }),
    execute: async ({ n }) => biggestDrops(points(), n),
  }),
  biggestRisesTool: tool({
    description:
      "Devuelve las N subidas más grandes entre puntos consecutivos (valor sube más bruscamente).",
    inputSchema: z.object({ n: z.number().int().min(1).max(20).default(5) }),
    execute: async ({ n }) => biggestRises(points(), n),
  }),
  getHourlyAverage: tool({
    description:
      "Estadísticas completas (avg, mediana, pico, valle) de una hora entera del día. Usar para '¿cómo estuvo la hora X?'.",
    inputSchema: z.object({
      hour: z.string().describe("Hora a analizar, ej '14' o '14:00'"),
    }),
    execute: async ({ hour }) => hourlyAverage(points(), hour),
  }),
  describeRangeTool: tool({
    description:
      "Describe un rango horario con tendencia (subiendo/bajando/estable), cambio absoluto y porcentual. Ideal para '¿qué pasó entre X e Y?' o '¿cómo evolucionó la tarde?'.",
    inputSchema: z.object({
      from: z.string().describe("Hora inicio HH:MM o HH:MM:SS"),
      to: z.string().describe("Hora fin HH:MM o HH:MM:SS"),
    }),
    execute: async ({ from, to }) => describeRange(points(), from, to),
  }),
  findAnomaliesTool: tool({
    description:
      "Detecta puntos anómalos (outliers) del día usando desviación local. Ideal para '¿hubo algo raro?' o '¿hubo anomalías?'.",
    inputSchema: z.object({
      sigma: z
        .number()
        .min(1)
        .max(5)
        .default(2)
        .describe("Umbral de desviaciones estándar (default 2)"),
    }),
    execute: async ({ sigma }) => findAnomalies(points(), sigma),
  }),
};
