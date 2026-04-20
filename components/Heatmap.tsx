import type { Stats } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function Heatmap({ stats }: { stats: Stats }) {
  const max = Math.max(...stats.byHour.map((h) => h.avg));
  const min = Math.min(...stats.byHour.map((h) => h.avg));

  function color(v: number) {
    const t = (v - min) / (max - min || 1);
    // Burgundy oscuro → Rappi red vivo (ramp de luminancia, familia cálida)
    const k = Math.pow(t, 0.75);
    const r = Math.round(55 + (255 - 55) * k);
    const g = Math.round(20 + (68 - 20) * k);
    const b = Math.round(15 + (31 - 15) * k);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function legendColor(t: number) {
    const k = Math.pow(t, 0.75);
    const r = Math.round(55 + (255 - 55) * k);
    const g = Math.round(20 + (68 - 20) * k);
    const b = Math.round(15 + (31 - 15) * k);
    return `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur">
      <h2 className="mb-4 text-lg font-bold text-zinc-100">Intensidad por hora</h2>
      <div className="grid grid-cols-5 gap-1.5 md:grid-cols-7 lg:grid-cols-10">
        {stats.byHour.map((h) => (
          <div
            key={h.hour}
            title={`${h.hour}:00 — avg ${formatNum(h.avg)}, pico ${formatNum(h.peak)}`}
            className="flex aspect-square flex-col items-center justify-center rounded-md border border-zinc-700/50 text-center transition-transform hover:scale-110"
            style={{ backgroundColor: color(h.avg) }}
          >
            <span className="text-xs font-bold text-zinc-100">{h.hour}</span>
            <span className="text-[9px] text-zinc-300">
              {h.avg >= 1_000_000
                ? `${(h.avg / 1_000_000).toFixed(1)}M`
                : `${Math.round(h.avg / 1000)}k`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <span>Bajo</span>
        <div className="flex h-2 w-32 overflow-hidden rounded">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: legendColor(i / 9) }}
            />
          ))}
        </div>
        <span>Alto</span>
      </div>
    </div>
  );
}
