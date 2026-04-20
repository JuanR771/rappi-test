import type { Stats } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function TopMoments({ stats }: { stats: Stats }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur">
      <h2 className="mb-4 text-lg font-bold text-zinc-100">
        🏆 Top 5 momentos del día
      </h2>
      <div className="space-y-2">
        {stats.top5.map((p, i) => (
          <div
            key={p.ts}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? "bg-rappi-amber/20 text-rappi-amber"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="font-mono text-sm text-zinc-300">{p.t}</span>
            </div>
            <span className="text-base font-bold text-rappi-red">
              {formatNum(p.v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
