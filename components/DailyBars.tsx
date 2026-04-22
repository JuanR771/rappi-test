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
import type { DaySummary } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function DailyBars({
  daily,
  onSelect,
}: {
  daily: DaySummary[];
  onSelect?: (date: string) => void;
}) {
  const maxPeak = Math.max(...daily.map((d) => d.peak.v));
  const data = daily.map((d) => ({
    label: `${d.date.slice(5)}`,
    date: d.date,
    weekday: d.weekday,
    peak: d.peak.v,
    avg: d.avg,
    partial: d.partial,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 sm:text-base">
          Pico y promedio por día
        </h3>
        <span className="text-[10px] text-zinc-500 sm:text-xs">
          Click en una barra para ver el día
        </span>
      </div>
      <div className="h-60 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#71717a"
              fontSize={11}
              tickFormatter={(v: string, i: number) => `${v}\n${data[i]?.weekday ?? ""}`}
            />
            <YAxis stroke="#71717a" fontSize={11} tickFormatter={formatCompact} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                color: "#f4f4f5",
              }}
              labelFormatter={(l, payload) => {
                const d = payload?.[0]?.payload as { date: string; weekday: string } | undefined;
                return d ? `${d.weekday} ${d.date}` : String(l ?? "");
              }}
              formatter={(v, name) => [
                formatNum(Number(v)),
                name === "peak" ? "pico" : "promedio",
              ]}
            />
            <Bar
              dataKey="peak"
              fill="#ff441f"
              radius={[4, 4, 0, 0]}
              onClick={(entry) => {
                const d = entry as unknown as { date: string };
                if (d?.date && onSelect) onSelect(d.date);
              }}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              {data.map((d) => (
                <Cell
                  key={d.date}
                  fill={d.partial ? "#a1a1aa" : d.peak === maxPeak ? "#f59e0b" : "#ff441f"}
                />
              ))}
            </Bar>
            <Bar dataKey="avg" fill="#fbbf24" radius={[4, 4, 0, 0]} opacity={0.55} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
