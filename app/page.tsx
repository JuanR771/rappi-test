import { loadOverall, loadStats, listDays } from "@/lib/data";
import { DashboardSwitcher, type DayBundle } from "@/components/DashboardSwitcher";
import { RappiLogo } from "@/components/RappiLogo";

export default function Home() {
  const overall = loadOverall();
  const days: DayBundle[] = listDays().map((date) => ({
    date,
    stats: loadStats(date),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xl font-bold tracking-tight sm:text-2xl">
              <RappiLogo className="text-3xl sm:text-4xl" />
              <span className="text-zinc-100">Disponibilidad de tiendas</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              {overall.description} {overall.totalDays} días disponibles:{" "}
              <span className="font-semibold text-zinc-300">
                {overall.days[0]} → {overall.days[overall.days.length - 1]}
              </span>
              .
            </p>
          </div>
          <div className="text-left text-[10px] text-zinc-500 sm:text-right sm:text-xs">
            <div>
              Métrica: <code className="text-zinc-400">{overall.metric}</code>
            </div>
            <div>Fuente: monitoreo sintético · granularidad {overall.granularitySec}s</div>
          </div>
        </header>

        <DashboardSwitcher overall={overall} days={days} />

        <footer className="pt-4 text-center text-[10px] text-zinc-600 sm:pt-6 sm:text-xs">
          Prueba Técnica <span className="text-rappi-red">RappiMakers 2026</span> · Next.js + Recharts + Gemini 2.5 Flash (fallback Groq)
        </footer>
      </div>
    </div>
  );
}
