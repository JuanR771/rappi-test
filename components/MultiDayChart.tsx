"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Overall } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function bogotaLabel(ts: number) {
  const d = new Date(ts - 5 * 3600 * 1000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return { short: `${mm}-${dd} ${hh}:${mi}`, dayOnly: `${mm}-${dd}` };
}

export function MultiDayChart({ overall }: { overall: Overall }) {
  const [bucket, setBucket] = useState<1 | 5 | 15>(5);

  const data = useMemo(() => {
    const bucketMs = bucket * 60 * 1000;
    const buckets = new Map<number, number[]>();
    for (const p of overall.minuteSeries) {
      const key = Math.floor(p.ts / bucketMs) * bucketMs;
      const arr = buckets.get(key) ?? [];
      arr.push(p.v);
      buckets.set(key, arr);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, arr]) => ({
        ts,
        v: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length),
        label: bogotaLabel(ts).short,
      }));
  }, [overall.minuteSeries, bucket]);

  const peak = useMemo(() => data.reduce((a, b) => (b.v > a.v ? b : a), data[0]), [data]);

  // Marcar el inicio de cada día en el eje X
  const dayStarts = useMemo(() => {
    const seen = new Set<string>();
    const marks: { ts: number; label: string }[] = [];
    for (const p of data) {
      const { dayOnly } = bogotaLabel(p.ts);
      if (!seen.has(dayOnly)) {
        seen.add(dayOnly);
        marks.push({ ts: p.ts, label: dayOnly });
      }
    }
    return marks;
  }, [data]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 backdrop-blur sm:p-4">
      <div className="relative mb-3 sm:mb-4">
        <div className="absolute right-0 top-0">
          <select
            value={bucket}
            onChange={(e) => setBucket(Number(e.target.value) as 1 | 5 | 15)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
          >
            <option value={1}>1 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
          </select>
        </div>
        <div className="pt-10 text-center sm:pt-0 sm:pl-20">
          <h2 className="text-base font-bold text-zinc-100 sm:text-lg">
            Tiendas visibles · {overall.totalDays} días ({overall.days[0]} → {overall.days[overall.days.length - 1]})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Pico global de {formatCompact(overall.globalPeak.v)} el {overall.globalPeak.date} a las {overall.globalPeak.t} · promedio {formatCompact(overall.globalAvg)}
          </p>
        </div>
      </div>

      <div className="h-72 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff441f" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#ff441f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              stroke="#71717a"
              fontSize={10}
              tickMargin={5}
              ticks={dayStarts.map((d) => d.ts)}
              tickFormatter={(ts: number) => bogotaLabel(ts).dayOnly}
            />
            <YAxis stroke="#71717a" fontSize={11} tickFormatter={formatCompact} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                color: "#f4f4f5",
              }}
              labelStyle={{ color: "#a1a1aa" }}
              labelFormatter={(ts: unknown) => bogotaLabel(Number(ts)).short}
              formatter={(v: unknown) => [formatNum(Number(v)), "tiendas"]}
            />
            {peak && (
              <ReferenceDot
                x={peak.ts}
                y={peak.v}
                r={5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
            <Area
              type="monotone"
              dataKey="v"
              stroke="#ff441f"
              strokeWidth={1.5}
              fill="url(#overallFill)"
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
