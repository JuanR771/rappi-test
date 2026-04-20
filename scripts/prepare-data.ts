import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

type Point = { t: string; ts: number; v: number };

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const OUT_DIR = path.join(process.cwd(), "public", "data");

const TS_REGEX = /(\d{2}):(\d{2}):(\d{2})/;

function parseTimeCol(col: string): string | null {
  const m = col.match(TS_REGEX);
  return m ? `${m[1]}:${m[2]}:${m[3]}` : null;
}

function timeToEpoch(t: string): number {
  const [hh, mm, ss] = t.split(":").map(Number);
  const base = new Date("2026-02-01T00:00:00-05:00").getTime();
  let sec = hh * 3600 + mm * 60 + ss;
  if (hh < 6) sec += 24 * 3600;
  return base + sec * 1000;
}

function loadCsv(file: string): Map<string, number> {
  const text = fs.readFileSync(file, "utf8");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) return new Map();
  const header = rows[0];
  const dataRow = rows[1];
  const out = new Map<string, number>();
  for (let i = 4; i < header.length; i++) {
    const t = parseTimeCol(header[i]);
    if (!t) continue;
    const raw = dataRow[i];
    if (raw === undefined || raw === "") continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    out.set(t, v);
  }
  return out;
}

function main() {
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.toLowerCase().endsWith(".csv") && !f.startsWith("._"))
    .map((f) => path.join(RAW_DIR, f));

  console.log(`Found ${files.length} CSVs`);

  const merged = new Map<string, number>();
  for (const f of files) {
    const m = loadCsv(f);
    for (const [t, v] of m) {
      const cur = merged.get(t);
      if (cur === undefined || v > cur) merged.set(t, v);
    }
  }

  const points: Point[] = [];
  for (const [t, v] of merged) points.push({ t, ts: timeToEpoch(t), v });
  points.sort((a, b) => a.ts - b.ts);

  // Stats
  const peak = points.reduce((a, b) => (b.v > a.v ? b : a));
  const valley = points.reduce((a, b) => (b.v < a.v ? b : a));
  const avg = Math.round(points.reduce((s, p) => s + p.v, 0) / points.length);

  // byHour: agrupar por HH
  const byHourMap = new Map<string, number[]>();
  for (const p of points) {
    const hh = p.t.slice(0, 2);
    const arr = byHourMap.get(hh) ?? [];
    arr.push(p.v);
    byHourMap.set(hh, arr);
  }

  const hourOrder = (h: string) => (Number(h) < 6 ? Number(h) + 24 : Number(h));
  const byHour = Array.from(byHourMap.entries())
    .map(([hour, arr]) => ({
      hour,
      count: arr.length,
      avg: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
      peak: Math.max(...arr),
      min: Math.min(...arr),
    }))
    .sort((a, b) => hourOrder(a.hour) - hourOrder(b.hour));

  // Top 5 momentos
  const top5 = [...points].sort((a, b) => b.v - a.v).slice(0, 5);

  // Rango cubierto
  const firstT = points[0].t;
  const lastT = points[points.length - 1].t;

  const stats = {
    metric: "synthetic_monitoring_visible_stores",
    date: "2026-02-01",
    description:
      "Número de tiendas visibles reportado por monitoreo sintético de Rappi (snapshot cada 10s).",
    granularitySec: 10,
    totalPoints: points.length,
    coverage: { first: firstT, last: lastT },
    peak,
    valley,
    avg,
    byHour,
    top5,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "availability.json"),
    JSON.stringify({ metric: stats.metric, date: stats.date, granularitySec: 10, points }),
  );
  fs.writeFileSync(path.join(OUT_DIR, "stats.json"), JSON.stringify(stats, null, 2));

  console.log(`✓ ${points.length} puntos → public/data/availability.json`);
  console.log(`✓ stats → public/data/stats.json`);
  console.log(`  peak:   ${peak.t} = ${peak.v}`);
  console.log(`  valley: ${valley.t} = ${valley.v}`);
  console.log(`  avg:    ${avg}`);
}

main();
