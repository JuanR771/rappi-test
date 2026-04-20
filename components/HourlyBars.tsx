"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function HourlyBars({ stats }: { stats: Stats }) {
  const data = stats.byHour.map((h) => ({
    hour: `${h.hour}:00`,
    avg: h.avg,
    peak: h.peak,
  }));
  const peakHour = stats.peak.t.slice(0, 2) + ":00";

  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    const isPeak = label === peakHour;
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 shadow">
        <div className="font-semibold">
          {label}
          {isPeak && " 🏆"}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: isPeak ? "#ffb800" : "#ff441f" }}
          />
          <span>avg: {formatNum(payload[0].value)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">Promedio por hora</h2>
        <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-sm bg-rappi-amber" />
          hora pico
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff7a59" />
                <stop offset="100%" stopColor="#ff441f" />
              </linearGradient>
              <linearGradient id="barFillPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffc95c" />
                <stop offset="100%" stopColor="#ffb800" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" stroke="#71717a" fontSize={11} />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : `${(v / 1_000).toFixed(0)}k`
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a33" }} />
            <Bar
              dataKey="avg"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            >
              {data.map((d) => (
                <Cell
                  key={d.hour}
                  fill={
                    d.hour === peakHour
                      ? "url(#barFillPeak)"
                      : "url(#barFill)"
                  }
                  stroke={d.hour === peakHour ? "#ffb800" : undefined}
                  strokeWidth={d.hour === peakHour ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
