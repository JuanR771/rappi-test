import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

type Point = { t: string; ts: number; v: number };

type DaySummary = {
  date: string;
  weekday: string;
  totalPoints: number;
  coverage: { first: string; last: string };
  peak: Point;
  valley: Point;
  avg: number;
  partial: boolean;
};

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const OUT_DIR = path.join(process.cwd(), "public", "data");
const DAYS_DIR = path.join(OUT_DIR, "days");

const METRIC = "synthetic_monitoring_visible_stores";
const DESCRIPTION =
  "Número de tiendas visibles reportado por monitoreo sintético de Rappi (snapshot cada 10s).";
const GRANULARITY_SEC = 10;
const EXPECTED_POINTS_FULL_DAY = (24 * 3600) / GRANULARITY_SEC;

const WEEKDAY_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function bogotaParts(ts: number) {
  const d = new Date(ts - 5 * 3600 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}:${ss}`,
    weekday: WEEKDAY_ES[d.getUTCDay()],
  };
}

function parseHeaderTs(col: string): number | null {
  const t = Date.parse(col);
  return Number.isFinite(t) ? t : null;
}

function loadCsv(file: string): Array<{ ts: number; v: number }> {
  const text = fs.readFileSync(file, "utf8");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) return [];
  const header = rows[0];
  const dataRow = rows[1];
  const out: Array<{ ts: number; v: number }> = [];
  for (let i = 4; i < header.length; i++) {
    const ts = parseHeaderTs(header[i]);
    if (ts === null) continue;
    const raw = dataRow[i];
    if (raw === undefined || raw === "") continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    out.push({ ts, v });
  }
  return out;
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`No existe ${RAW_DIR}. Descomprimí Archivo.zip dentro de data/raw/.`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(RAW_DIR)
    .filter((f) => f.toLowerCase().endsWith(".csv") && !f.startsWith("._"))
    .map((f) => path.join(RAW_DIR, f));

  console.log(`Found ${files.length} CSVs`);

  // Merge por día: date -> Map<ts, v> (max si colisionan ventanas que se solapan)
  const byDay = new Map<string, Map<number, number>>();
  for (const f of files) {
    const rows = loadCsv(f);
    for (const { ts, v } of rows) {
      const { date } = bogotaParts(ts);
      let m = byDay.get(date);
      if (!m) {
        m = new Map();
        byDay.set(date, m);
      }
      const cur = m.get(ts);
      if (cur === undefined || v > cur) m.set(ts, v);
    }
  }

  fs.mkdirSync(DAYS_DIR, { recursive: true });
  for (const dir of fs.readdirSync(DAYS_DIR)) {
    fs.rmSync(path.join(DAYS_DIR, dir), { recursive: true, force: true });
  }

  const orderedDates = [...byDay.keys()].sort();
  const dailySummaries: DaySummary[] = [];
  const hourlyByDay: (number | null)[][] = [];

  for (const date of orderedDates) {
    const m = byDay.get(date)!;
    const points: Point[] = [];
    for (const [ts, v] of m) {
      const { time } = bogotaParts(ts);
      points.push({ t: time, ts, v });
    }
    points.sort((a, b) => a.ts - b.ts);

    const peak = points.reduce((a, b) => (b.v > a.v ? b : a));
    const valley = points.reduce((a, b) => (b.v < a.v ? b : a));
    const avg = Math.round(points.reduce((s, p) => s + p.v, 0) / points.length);

    const byHourMap = new Map<string, number[]>();
    for (const p of points) {
      const hh = p.t.slice(0, 2);
      const arr = byHourMap.get(hh) ?? [];
      arr.push(p.v);
      byHourMap.set(hh, arr);
    }
    const byHour = Array.from(byHourMap.entries())
      .map(([hour, arr]) => ({
        hour,
        count: arr.length,
        avg: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
        peak: Math.max(...arr),
        min: Math.min(...arr),
      }))
      .sort((a, b) => Number(a.hour) - Number(b.hour));

    const top5 = [...points].sort((a, b) => b.v - a.v).slice(0, 5);
    const firstT = points[0].t;
    const lastT = points[points.length - 1].t;
    const weekday = bogotaParts(points[0].ts).weekday;
    const partial = points.length < EXPECTED_POINTS_FULL_DAY * 0.5;

    const stats = {
      metric: METRIC,
      date,
      weekday,
      description: DESCRIPTION,
      granularitySec: GRANULARITY_SEC,
      totalPoints: points.length,
      partial,
      coverage: { first: firstT, last: lastT },
      peak,
      valley,
      avg,
      byHour,
      top5,
    };

    const availability = {
      metric: METRIC,
      date,
      weekday,
      granularitySec: GRANULARITY_SEC,
      points,
    };

    const dayDir = path.join(DAYS_DIR, date);
    fs.mkdirSync(dayDir, { recursive: true });
    fs.writeFileSync(path.join(dayDir, "availability.json"), JSON.stringify(availability));
    fs.writeFileSync(path.join(dayDir, "stats.json"), JSON.stringify(stats, null, 2));

    dailySummaries.push({
      date,
      weekday,
      totalPoints: points.length,
      coverage: { first: firstT, last: lastT },
      peak,
      valley,
      avg,
      partial,
    });

    const hours: (number | null)[] = new Array(24).fill(null);
    for (const h of byHour) hours[Number(h.hour)] = h.avg;
    hourlyByDay.push(hours);

    console.log(
      `  ${date} (${weekday}) · ${points.length} pts · peak ${peak.v} @ ${peak.t}` +
        (partial ? " · PARCIAL" : ""),
    );
  }

  // Overall aggregates
  const globalPeak = dailySummaries.reduce((a, b) => (b.peak.v > a.peak.v ? b : a));
  const globalValley = dailySummaries.reduce((a, b) => (b.valley.v < a.valley.v ? b : a));
  const globalAvg = Math.round(
    dailySummaries.reduce((s, d) => s + d.avg * d.totalPoints, 0) /
      dailySummaries.reduce((s, d) => s + d.totalPoints, 0),
  );

  const weekdayAggregate = new Map<string, { sum: number; count: number }>();
  for (const d of dailySummaries) {
    const cur = weekdayAggregate.get(d.weekday) ?? { sum: 0, count: 0 };
    cur.sum += d.avg * d.totalPoints;
    cur.count += d.totalPoints;
    weekdayAggregate.set(d.weekday, cur);
  }
  const weekdayAvg = [...weekdayAggregate.entries()].map(([weekday, { sum, count }]) => ({
    weekday,
    avg: Math.round(sum / count),
  }));

  // Serie downsampleada: 1 punto por minuto combinando todos los días
  const minuteSeries: { ts: number; v: number }[] = [];
  for (const date of orderedDates) {
    const m = byDay.get(date)!;
    const minuteBuckets = new Map<number, number[]>();
    for (const [ts, v] of m) {
      const key = Math.floor(ts / 60000) * 60000;
      const arr = minuteBuckets.get(key) ?? [];
      arr.push(v);
      minuteBuckets.set(key, arr);
    }
    for (const [key, arr] of [...minuteBuckets.entries()].sort((a, b) => a[0] - b[0])) {
      minuteSeries.push({
        ts: key,
        v: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length),
      });
    }
  }

  const overall = {
    metric: METRIC,
    description: DESCRIPTION,
    granularitySec: GRANULARITY_SEC,
    days: dailySummaries.map((d) => d.date),
    totalDays: dailySummaries.length,
    totalPoints: dailySummaries.reduce((s, d) => s + d.totalPoints, 0),
    globalPeak: { date: globalPeak.date, ...globalPeak.peak },
    globalValley: { date: globalValley.date, ...globalValley.valley },
    globalAvg,
    daily: dailySummaries,
    hourlyByDay,
    weekdayAvg,
    minuteSeries,
  };

  const index = {
    metric: METRIC,
    description: DESCRIPTION,
    granularitySec: GRANULARITY_SEC,
    days: dailySummaries.map((d) => ({
      date: d.date,
      weekday: d.weekday,
      totalPoints: d.totalPoints,
      coverage: d.coverage,
      avg: d.avg,
      peak: d.peak,
      valley: d.valley,
      partial: d.partial,
    })),
  };

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "overall.json"), JSON.stringify(overall));

  // Limpiar artefactos del pipeline anterior (single-day)
  for (const legacy of ["availability.json", "stats.json"]) {
    const p = path.join(OUT_DIR, legacy);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log(`\n✓ ${dailySummaries.length} días → public/data/days/<YYYY-MM-DD>/`);
  console.log(`✓ index.json + overall.json`);
  console.log(
    `  pico global: ${globalPeak.peak.v} @ ${globalPeak.date} ${globalPeak.peak.t}`,
  );
  console.log(
    `  valle global: ${globalValley.valley.v} @ ${globalValley.date} ${globalValley.valley.t}`,
  );
  console.log(`  avg global: ${globalAvg}`);
}

main();
