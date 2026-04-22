import type { Point } from "./data";

export function resample(points: Point[], bucketSec: number): Point[] {
  if (bucketSec <= 10) return points;
  const bucketMs = bucketSec * 1000;
  const buckets = new Map<number, Point[]>();
  for (const p of points) {
    const key = Math.floor(p.ts / bucketMs) * bucketMs;
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }
  const out: Point[] = [];
  for (const [key, arr] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const avg = Math.round(arr.reduce((s, p) => s + p.v, 0) / arr.length);
    const d = new Date(key);
    const t = `${String(d.getUTCHours() - 5 + 24).slice(-2)}:${String(
      d.getUTCMinutes(),
    ).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
    out.push({ t: arr[0].t, ts: key, v: avg });
  }
  return out;
}

function timeToSec(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function normalizeTime(input: string): string {
  const parts = input.trim().split(":").map((p) => p.padStart(2, "0"));
  while (parts.length < 3) parts.push("00");
  return parts.slice(0, 3).join(":");
}

export function findNearest(points: Point[], time: string): Point | null {
  const target = timeToSec(normalizeTime(time));
  let best: Point | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(timeToSec(p.t) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

export function getRange(
  points: Point[],
  from: string,
  to: string,
): Point[] {
  const f = timeToSec(normalizeTime(from));
  const t = timeToSec(normalizeTime(to));
  return points.filter((p) => {
    const s = timeToSec(p.t);
    return s >= f && s <= t;
  });
}

export function rangeStats(points: Point[], from: string, to: string) {
  const slice = getRange(points, from, to);
  if (slice.length === 0) return null;
  const vs = slice.map((p) => p.v);
  const peak = slice.reduce((a, b) => (b.v > a.v ? b : a));
  const valley = slice.reduce((a, b) => (b.v < a.v ? b : a));
  return {
    from,
    to,
    count: slice.length,
    avg: Math.round(vs.reduce((s, v) => s + v, 0) / vs.length),
    peak,
    valley,
  };
}

export function topN(points: Point[], n: number): Point[] {
  return [...points].sort((a, b) => b.v - a.v).slice(0, n);
}

export function bottomN(points: Point[], n: number): Point[] {
  return [...points].sort((a, b) => a.v - b.v).slice(0, n);
}

export function compareHours(points: Point[], hourA: string, hourB: string) {
  const hh = (s: string) => s.padStart(2, "0").slice(0, 2);
  const a = getRange(points, `${hh(hourA)}:00:00`, `${hh(hourA)}:59:50`);
  const b = getRange(points, `${hh(hourB)}:00:00`, `${hh(hourB)}:59:50`);
  const stat = (arr: Point[]) =>
    arr.length
      ? {
          avg: Math.round(arr.reduce((s, p) => s + p.v, 0) / arr.length),
          peak: arr.reduce((x, y) => (y.v > x.v ? y : x)),
          valley: arr.reduce((x, y) => (y.v < x.v ? y : x)),
        }
      : null;
  const sa = stat(a);
  const sb = stat(b);
  return {
    hourA: { hour: hh(hourA), ...sa },
    hourB: { hour: hh(hourB), ...sb },
    diffAvg: sa && sb ? sa.avg - sb.avg : null,
    diffPctAvg:
      sa && sb && sb.avg !== 0
        ? Math.round(((sa.avg - sb.avg) / sb.avg) * 10000) / 100
        : null,
  };
}

export function biggestDrops(points: Point[], n: number) {
  const drops: { from: Point; to: Point; delta: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = points[i].v - points[i - 1].v;
    if (d < 0) drops.push({ from: points[i - 1], to: points[i], delta: d });
  }
  return drops.sort((a, b) => a.delta - b.delta).slice(0, n);
}

export function hourlyAverage(points: Point[], hour: string) {
  const hh = hour.padStart(2, "0").slice(0, 2);
  const slice = getRange(points, `${hh}:00:00`, `${hh}:59:50`);
  if (slice.length === 0) return null;
  const vs = slice.map((p) => p.v);
  const sorted = [...vs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    hour: hh,
    count: slice.length,
    avg: Math.round(vs.reduce((s, v) => s + v, 0) / vs.length),
    median,
    peak: slice.reduce((a, b) => (b.v > a.v ? b : a)),
    valley: slice.reduce((a, b) => (b.v < a.v ? b : a)),
  };
}

export function describeRange(points: Point[], from: string, to: string) {
  const slice = getRange(points, from, to);
  if (slice.length < 2) return null;
  const first = slice[0];
  const last = slice[slice.length - 1];
  const vs = slice.map((p) => p.v);
  const peak = slice.reduce((a, b) => (b.v > a.v ? b : a));
  const valley = slice.reduce((a, b) => (b.v < a.v ? b : a));
  const avg = Math.round(vs.reduce((s, v) => s + v, 0) / vs.length);
  const delta = last.v - first.v;
  const pctChange = first.v !== 0 ? Math.round((delta / first.v) * 10000) / 100 : null;
  let trend: "subiendo" | "bajando" | "estable" = "estable";
  const thr = avg * 0.05;
  if (delta > thr) trend = "subiendo";
  else if (delta < -thr) trend = "bajando";
  return {
    from,
    to,
    count: slice.length,
    first,
    last,
    peak,
    valley,
    avg,
    delta,
    pctChange,
    trend,
  };
}

export function findAnomalies(points: Point[], sigma = 2) {
  if (points.length < 10) return [];
  const vs = points.map((p) => p.v);
  const avg = vs.reduce((s, v) => s + v, 0) / vs.length;
  const variance = vs.reduce((s, v) => s + (v - avg) ** 2, 0) / vs.length;
  const std = Math.sqrt(variance);
  const threshold = sigma * std;
  const anomalies: { point: Point; deviation: number }[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].v;
    const next = points[i + 1].v;
    const local = (prev + next) / 2;
    const dev = Math.abs(points[i].v - local);
    if (dev > threshold) anomalies.push({ point: points[i], deviation: dev });
  }
  return anomalies.sort((a, b) => b.deviation - a.deviation).slice(0, 10);
}

export function biggestRises(points: Point[], n: number) {
  const rises: { from: Point; to: Point; delta: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = points[i].v - points[i - 1].v;
    if (d > 0) rises.push({ from: points[i - 1], to: points[i], delta: d });
  }
  return rises.sort((a, b) => b.delta - a.delta).slice(0, n);
}
