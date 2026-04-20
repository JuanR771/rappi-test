import { loadAvailability, loadStats } from "@/lib/data";
import { KpiCards } from "@/components/KpiCards";
import { MainChart } from "@/components/MainChart";
import { HourlyBars } from "@/components/HourlyBars";
import { Heatmap } from "@/components/Heatmap";
import { TopMoments } from "@/components/TopMoments";
import { Chatbot } from "@/components/Chatbot";
import { ChatProvider } from "@/components/ChatContext";
import { RappiLogo } from "@/components/RappiLogo";

export default function Home() {
  const stats = loadStats();
  const avail = loadAvailability();

  return (
    <ChatProvider>
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xl font-bold tracking-tight sm:text-2xl">
              <RappiLogo className="text-3xl sm:text-4xl" />
              <span className="text-zinc-100">Disponibilidad de tiendas</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              {stats.description} Día{" "}
              <span className="font-semibold text-zinc-300">{stats.date}</span>.
            </p>
          </div>
          <div className="text-left text-[10px] text-zinc-500 sm:text-right sm:text-xs">
            <div>
              Métrica: <code className="text-zinc-400">{stats.metric}</code>
            </div>
            <div>Fuente: monitoreo sintético · granularidad 10s</div>
          </div>
        </header>

        <KpiCards stats={stats} />

        <MainChart points={avail.points} />

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <HourlyBars stats={stats} />
          <Heatmap stats={stats} />
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <TopMoments stats={stats} />
          <Chatbot />
        </div>

        <footer className="pt-4 text-center text-[10px] text-zinc-600 sm:pt-6 sm:text-xs">
          Prueba Técnica <span className="text-rappi-red">RappiMakers 2026</span> · Next.js + Recharts + Gemini 2.5 Flash (fallback Groq)
        </footer>
      </div>
    </div>
    </ChatProvider>
  );
}
