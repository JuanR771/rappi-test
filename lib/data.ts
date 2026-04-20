import fs from "node:fs";
import path from "node:path";

export type Point = { t: string; ts: number; v: number };

export type Availability = {
  metric: string;
  date: string;
  granularitySec: number;
  points: Point[];
};

export type Stats = {
  metric: string;
  date: string;
  description: string;
  granularitySec: number;
  totalPoints: number;
  coverage: { first: string; last: string };
  peak: Point;
  valley: Point;
  avg: number;
  byHour: {
    hour: string;
    count: number;
    avg: number;
    peak: number;
    min: number;
  }[];
  top5: Point[];
};

let cachedAvail: Availability | null = null;
let cachedStats: Stats | null = null;

export function loadAvailability(): Availability {
  if (cachedAvail) return cachedAvail;
  const p = path.join(process.cwd(), "public", "data", "availability.json");
  cachedAvail = JSON.parse(fs.readFileSync(p, "utf8")) as Availability;
  return cachedAvail;
}

export function loadStats(): Stats {
  if (cachedStats) return cachedStats;
  const p = path.join(process.cwd(), "public", "data", "stats.json");
  cachedStats = JSON.parse(fs.readFileSync(p, "utf8")) as Stats;
  return cachedStats;
}
