"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Point } from "@/lib/data";
import { ExplainButton } from "./ExplainButton";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function timeToSec(t: string) {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function resample(points: Point[], bucketSec: number) {
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
    out.push({ t: arr[0].t.slice(0, 5), ts: key, v: avg });
  }
  return out;
}

const BUCKET_LABEL: Record<number, string> = {
  10: "cada 10s",
  60: "promediado por 1 min",
  300: "promediado por 5 min",
  600: "promediado por 10 min",
};

export function MainChart({ points, date }: { points: Point[]; date: string }) {
  const [bucket, setBucket] = useState(60);
  const [range, setRange] = useState<[string, string]>([
    points[0].t,
    points[points.length - 1].t,
  ]);

  const filtered = useMemo(() => {
    const [from, to] = range;
    const f = timeToSec(from);
    const t = timeToSec(to);
    return points.filter((p) => {
      const s = timeToSec(p.t);
      return s >= f && s <= t;
    });
  }, [points, range]);

  const data = useMemo(() => resample(filtered, bucket), [filtered, bucket]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const vs = data.map((p) => p.v);
    const avg = Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
    const peak = data.reduce((a, b) => (b.v > a.v ? b : a));
    return { avg, peak };
  }, [data]);

  const isFullDay =
    range[0] === points[0].t && range[1] === points[points.length - 1].t;

  const title = isFullDay
    ? `Tiendas visibles durante el día ${date}`
    : `Tiendas visibles durante la hora ${range[0].slice(0, 2)}:00`;

  const subtitle = stats
    ? `Pico de ${formatCompact(stats.peak.v)} tiendas a las ${stats.peak.t} · ${BUCKET_LABEL[bucket]}`
    : "";

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 backdrop-blur sm:p-4">
      <div className="relative mb-3 sm:mb-4">
        <div className="absolute right-0 top-0 flex flex-wrap gap-2">
          <select
            value={`${range[0]}|${range[1]}`}
            onChange={(e) => {
              const [a, b] = e.target.value.split("|");
              setRange([a, b]);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
          >
            <option value={`${points[0].t}|${points[points.length - 1].t}`}>
              Día completo
            </option>
            {hours.map((h) => (
              <option key={h} value={`${h}:00:00|${h}:59:50`}>
                Solo {h}:00
              </option>
            ))}
          </select>
          <select
            value={bucket}
            onChange={(e) => setBucket(Number(e.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
          >
            <option value={10}>10s</option>
            <option value={60}>1min</option>
            <option value={300}>5min</option>
            <option value={600}>10min</option>
          </select>
        </div>
        <div className="pt-10 text-center sm:pt-0 sm:pl-20">
          <h2 className="text-base font-bold text-zinc-100 sm:text-lg">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          <ExplainButton
            prompt={
              isFullDay
                ? `Resume el día ${date}: pico, valle, forma de la curva, caídas o subidas destacables, y cómo se compara con el promedio de los otros días disponibles.`
                : `Analiza el tramo entre ${range[0]} y ${range[1]} del día ${date} y compáralo con el resto del día: ¿cómo se ve contra el promedio general, hubo caídas o subidas destacables, y qué momento marca la diferencia en ese rango?`
            }
          />
        </div>
      </div>

      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff441f" stopOpacity={0.65} />
                <stop offset="100%" stopColor="#ff441f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="t"
              stroke="#71717a"
              fontSize={11}
              tickMargin={5}
              minTickGap={40}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickFormatter={formatCompact}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                color: "#f4f4f5",
              }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(v: unknown) => [formatNum(Number(v)), "tiendas"]}
            />
            {stats && (
              <ReferenceLine
                y={stats.avg}
                stroke="#a1a1aa"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: `avg ${formatCompact(stats.avg)}`,
                  fill: "#a1a1aa",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
            {stats && (
              <ReferenceDot
                x={stats.peak.t}
                y={stats.peak.v}
                r={5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={1.5}
                label={{
                  value: `${formatCompact(stats.peak.v)} @ ${stats.peak.t}`,
                  position: "top",
                  fill: "#f59e0b",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="v"
              stroke="#ff441f"
              strokeWidth={2}
              fill="url(#areaFill)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
