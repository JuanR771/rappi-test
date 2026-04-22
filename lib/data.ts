import fs from "node:fs";
import path from "node:path";

export type Point = { t: string; ts: number; v: number };

export type Availability = {
  metric: string;
  date: string;
  weekday: string;
  granularitySec: number;
  points: Point[];
};

export type HourStat = {
  hour: string;
  count: number;
  avg: number;
  peak: number;
  min: number;
};

export type Stats = {
  metric: string;
  date: string;
  weekday: string;
  description: string;
  granularitySec: number;
  totalPoints: number;
  partial: boolean;
  coverage: { first: string; last: string };
  peak: Point;
  valley: Point;
  avg: number;
  byHour: HourStat[];
  top5: Point[];
};

export type DaySummary = {
  date: string;
  weekday: string;
  totalPoints: number;
  coverage: { first: string; last: string };
  avg: number;
  peak: Point;
  valley: Point;
  partial: boolean;
};

export type DayIndex = {
  metric: string;
  description: string;
  granularitySec: number;
  days: DaySummary[];
};

export type Overall = {
  metric: string;
  description: string;
  granularitySec: number;
  days: string[];
  totalDays: number;
  totalPoints: number;
  globalPeak: Point & { date: string };
  globalValley: Point & { date: string };
  globalAvg: number;
  daily: DaySummary[];
  hourlyByDay: (number | null)[][];
  weekdayAvg: { weekday: string; avg: number }[];
  minuteSeries: { ts: number; v: number }[];
};

const DATA_DIR = path.join(process.cwd(), "public", "data");

let cachedIndex: DayIndex | null = null;
let cachedOverall: Overall | null = null;
const availCache = new Map<string, Availability>();
const statsCache = new Map<string, Stats>();

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

export function loadIndex(): DayIndex {
  if (cachedIndex) return cachedIndex;
  cachedIndex = readJson<DayIndex>(path.join(DATA_DIR, "index.json"));
  return cachedIndex;
}

export function loadOverall(): Overall {
  if (cachedOverall) return cachedOverall;
  cachedOverall = readJson<Overall>(path.join(DATA_DIR, "overall.json"));
  return cachedOverall;
}

export function listDays(): string[] {
  return loadIndex().days.map((d) => d.date);
}

export function loadAvailability(day: string): Availability {
  const hit = availCache.get(day);
  if (hit) return hit;
  const data = readJson<Availability>(
    path.join(DATA_DIR, "days", day, "availability.json"),
  );
  availCache.set(day, data);
  return data;
}

export function loadStats(day: string): Stats {
  const hit = statsCache.get(day);
  if (hit) return hit;
  const data = readJson<Stats>(path.join(DATA_DIR, "days", day, "stats.json"));
  statsCache.set(day, data);
  return data;
}
