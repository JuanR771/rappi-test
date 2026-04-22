import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  listDays,
  loadAvailability,
  loadIndex,
  loadOverall,
  loadStats,
  type Point,
} from "./data";
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

function validDays(): Set<string> {
  return new Set(listDays());
}

function resolveDay(day: string | undefined, activeDay: string): string | null {
  const d = day ?? activeDay;
  if (d === "overall") return null;
  return validDays().has(d) ? d : null;
}

function points(day: string): Point[] {
  return loadAvailability(day).points;
}

const DayArg = z
  .string()
  .optional()
  .describe(
    "Fecha YYYY-MM-DD. Si se omite se usa el día activo del dashboard. Los días válidos están en listAvailableDays.",
  );

export function buildDataTools(activeDay: string): ToolSet {
  const needDay = (day?: string) => {
    const d = resolveDay(day, activeDay);
    if (!d) {
      return {
        error:
          "Necesito una fecha específica (activeDay='overall'). Usa el parámetro day o pide al usuario que seleccione un día.",
      } as const;
    }
    return d;
  };

  return {
    listAvailableDays: tool({
      description:
        "Lista todos los días disponibles con su resumen (peak, valley, promedio). Úsalo cuando el usuario pregunte por varios días, comparaciones históricas, o cuando no esté claro de qué día habla.",
      inputSchema: z.object({}),
      execute: async () => {
        const idx = loadIndex();
        const overall = loadOverall();
        return {
          activeDay,
          totalDays: idx.days.length,
          globalPeak: overall.globalPeak,
          globalValley: overall.globalValley,
          globalAvg: overall.globalAvg,
          days: idx.days,
        };
      },
    }),
    getDailySummary: tool({
      description:
        "Resumen completo (peak, valley, avg, cobertura) de un día específico.",
      inputSchema: z.object({ day: DayArg }),
      execute: async ({ day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        const s = loadStats(d);
        return {
          date: s.date,
          weekday: s.weekday,
          coverage: s.coverage,
          totalPoints: s.totalPoints,
          partial: s.partial,
          peak: s.peak,
          valley: s.valley,
          avg: s.avg,
          top5: s.top5,
        };
      },
    }),
    compareDays: tool({
      description:
        "Compara dos días distintos: diferencia de pico, valle y promedio (absoluta y %).",
      inputSchema: z.object({
        dayA: z.string().describe("Primer día YYYY-MM-DD"),
        dayB: z.string().describe("Segundo día YYYY-MM-DD"),
      }),
      execute: async ({ dayA, dayB }) => {
        const valid = validDays();
        if (!valid.has(dayA) || !valid.has(dayB)) {
          return { error: "Alguna de las fechas no existe en el dataset." };
        }
        const a = loadStats(dayA);
        const b = loadStats(dayB);
        const pct = (x: number, y: number) =>
          y === 0 ? null : Math.round(((x - y) / y) * 10000) / 100;
        return {
          dayA: { date: a.date, weekday: a.weekday, peak: a.peak, valley: a.valley, avg: a.avg },
          dayB: { date: b.date, weekday: b.weekday, peak: b.peak, valley: b.valley, avg: b.avg },
          diffAvg: a.avg - b.avg,
          diffAvgPct: pct(a.avg, b.avg),
          diffPeak: a.peak.v - b.peak.v,
          diffPeakPct: pct(a.peak.v, b.peak.v),
        };
      },
    }),
    hourAcrossDays: tool({
      description:
        "Devuelve cómo estuvo una hora específica a lo largo de todos los días disponibles (avg, peak, valley por día). Útil para ver tendencias semanales de una franja horaria.",
      inputSchema: z.object({
        hour: z.string().describe("Hora del día, ej '14' o '14:00'"),
      }),
      execute: async ({ hour }) => {
        const days = listDays();
        const results = days.map((d) => {
          const hh = hourlyAverage(points(d), hour);
          return hh
            ? { date: d, hour: hh.hour, avg: hh.avg, peak: hh.peak.v, valley: hh.valley.v }
            : { date: d, hour, avg: null, peak: null, valley: null };
        });
        return { hour, perDay: results };
      },
    }),

    getValueAt: tool({
      description:
        "Valor de la métrica en un timestamp específico de un día. Formato HH:MM o HH:MM:SS (hora Colombia).",
      inputSchema: z.object({
        time: z.string().describe("HH:MM o HH:MM:SS"),
        day: DayArg,
      }),
      execute: async ({ time, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        const p = findNearest(points(d), time);
        if (!p) return { error: "No se encontró valor" };
        return { date: d, time: p.t, value: p.v };
      },
    }),
    getRangeStats: tool({
      description:
        "Estadísticas (min, max, promedio, # de puntos) en un rango horario del día indicado.",
      inputSchema: z.object({
        from: z.string(),
        to: z.string(),
        day: DayArg,
      }),
      execute: async ({ from, to, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, ...(rangeStats(points(d), from, to) ?? {}) };
      },
    }),
    getTopMoments: tool({
      description: "Devuelve los N momentos con mayor número de tiendas visibles del día indicado.",
      inputSchema: z.object({
        n: z.number().int().min(1).max(20).default(5),
        day: DayArg,
      }),
      execute: async ({ n, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, top: topN(points(d), n) };
      },
    }),
    compareHoursTool: tool({
      description: "Compara dos horas del mismo día (ej 10 vs 16).",
      inputSchema: z.object({
        hourA: z.string(),
        hourB: z.string(),
        day: DayArg,
      }),
      execute: async ({ hourA, hourB, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, ...compareHours(points(d), hourA, hourB) };
      },
    }),
    biggestDropsTool: tool({
      description: "Las N caídas consecutivas más grandes del día indicado.",
      inputSchema: z.object({
        n: z.number().int().min(1).max(20).default(5),
        day: DayArg,
      }),
      execute: async ({ n, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, drops: biggestDrops(points(d), n) };
      },
    }),
    biggestRisesTool: tool({
      description: "Las N subidas consecutivas más grandes del día indicado.",
      inputSchema: z.object({
        n: z.number().int().min(1).max(20).default(5),
        day: DayArg,
      }),
      execute: async ({ n, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, rises: biggestRises(points(d), n) };
      },
    }),
    getHourlyAverage: tool({
      description: "Estadísticas (avg, mediana, pico, valle) de una hora entera del día indicado.",
      inputSchema: z.object({
        hour: z.string(),
        day: DayArg,
      }),
      execute: async ({ hour, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, ...(hourlyAverage(points(d), hour) ?? {}) };
      },
    }),
    describeRangeTool: tool({
      description: "Describe un rango horario del día (tendencia, delta, % cambio).",
      inputSchema: z.object({
        from: z.string(),
        to: z.string(),
        day: DayArg,
      }),
      execute: async ({ from, to, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, ...(describeRange(points(d), from, to) ?? {}) };
      },
    }),
    findAnomaliesTool: tool({
      description: "Detecta puntos anómalos (outliers) del día indicado.",
      inputSchema: z.object({
        sigma: z.number().min(1).max(5).default(2),
        day: DayArg,
      }),
      execute: async ({ sigma, day }) => {
        const d = needDay(day);
        if (typeof d !== "string") return d;
        return { date: d, anomalies: findAnomalies(points(d), sigma) };
      },
    }),
  };
}
