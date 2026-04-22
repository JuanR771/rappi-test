"use client";

import type { DaySummary } from "@/lib/data";

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function color(t: number) {
  const k = Math.pow(t, 0.75);
  const r = Math.round(55 + (255 - 55) * k);
  const g = Math.round(20 + (68 - 20) * k);
  const b = Math.round(15 + (31 - 15) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

export function DayHeatmap({
  daily,
  hourlyByDay,
  onSelect,
}: {
  daily: DaySummary[];
  hourlyByDay: (number | null)[][];
  onSelect?: (date: string) => void;
}) {
  const all = hourlyByDay.flat().filter((v): v is number => v !== null);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 sm:text-base">
          Intensidad por día y hora
        </h3>
        <span className="text-[10px] text-zinc-500 sm:text-xs">avg de tiendas visibles</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-separate border-spacing-0.5 text-center text-[10px] text-zinc-300 sm:text-xs">
          <thead>
            <tr>
              <th className="w-20 text-left font-normal text-zinc-500">Día</th>
              {hours.map((h) => (
                <th key={h} className="font-normal text-zinc-500">
                  {String(h).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daily.map((d, rowIdx) => (
              <tr key={d.date}>
                <td
                  className="pr-2 text-left font-mono text-[10px] text-zinc-400 hover:text-rappi-red sm:text-[11px]"
                  style={{ cursor: onSelect ? "pointer" : "default" }}
                  onClick={() => onSelect?.(d.date)}
                >
                  {d.date.slice(5)} · {d.weekday}
                  {d.partial && <span className="ml-1 text-zinc-600">·p</span>}
                </td>
                {hours.map((h) => {
                  const v = hourlyByDay[rowIdx]?.[h] ?? null;
                  if (v === null) {
                    return (
                      <td
                        key={h}
                        className="h-6 rounded-sm border border-zinc-800/50 bg-zinc-950"
                        title={`${d.date} ${String(h).padStart(2, "0")}:00 — sin datos`}
                      />
                    );
                  }
                  const t = (v - min) / (max - min || 1);
                  return (
                    <td
                      key={h}
                      onClick={() => onSelect?.(d.date)}
                      className="h-6 rounded-sm border border-zinc-700/30"
                      style={{ backgroundColor: color(t), cursor: onSelect ? "pointer" : "default" }}
                      title={`${d.date} ${String(h).padStart(2, "0")}:00 — ${formatCompact(v)}`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        <span>Bajo</span>
        <div className="flex h-2 w-32 overflow-hidden rounded">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color(i / 9) }} />
          ))}
        </div>
        <span>Alto</span>
      </div>
    </div>
  );
}
