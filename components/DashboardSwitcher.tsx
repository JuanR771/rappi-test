"use client";

import { useEffect, useRef, useState } from "react";
import type { Availability, Overall, Stats } from "@/lib/data";
import { ChatProvider, useChatBridge } from "./ChatContext";
import { KpiCards } from "./KpiCards";
import { MainChart } from "./MainChart";
import { HourlyBars } from "./HourlyBars";
import { Heatmap } from "./Heatmap";
import { TopMoments } from "./TopMoments";
import { Chatbot } from "./Chatbot";
import { OverallKpis } from "./OverallKpis";
import { MultiDayChart } from "./MultiDayChart";
import { DailyBars } from "./DailyBars";
import { DayHeatmap } from "./DayHeatmap";

export type DayBundle = { date: string; stats: Stats };

type Props = {
  overall: Overall;
  days: DayBundle[];
};

function TabStrip({
  overall,
  days,
  active,
  onSelect,
}: {
  overall: Overall;
  days: DayBundle[];
  active: string;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
      <button
        onClick={() => onSelect("overall")}
        className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          active === "overall"
            ? "border-rappi-red bg-rappi-red/20 text-rappi-red"
            : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-rappi-red/50 hover:text-zinc-100"
        }`}
      >
        Vista general
        <div className="mt-0.5 text-[9px] font-normal opacity-70">
          {overall.totalDays} días
        </div>
      </button>
      {days.map((d) => {
        const isActive = active === d.date;
        const [, mm, dd] = d.date.split("-");
        return (
          <button
            key={d.date}
            onClick={() => onSelect(d.date)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${
              isActive
                ? "border-rappi-red bg-rappi-red/20 text-rappi-red"
                : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-rappi-red/50 hover:text-zinc-100"
            }`}
          >
            <div>{dd}/{mm}</div>
            <div className="mt-0.5 text-[9px] font-normal opacity-70">
              {d.stats.weekday}
              {d.stats.partial && " · parc"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Inner({ overall, days }: Props) {
  const { activeDay, setActiveDay } = useChatBridge();
  const availCache = useRef<Map<string, Availability>>(new Map());
  const [loadedAvail, setLoadedAvail] = useState<Availability | null>(null);
  const [loadingDay, setLoadingDay] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qd = params.get("day");
    if (qd && (qd === "overall" || days.some((d) => d.date === qd))) {
      setActiveDay(qd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeDay === "overall") {
      setLoadedAvail(null);
      return;
    }
    const cached = availCache.current.get(activeDay);
    if (cached) {
      setLoadedAvail(cached);
      return;
    }
    setLoadingDay(activeDay);
    fetch(`/api/day/${activeDay}`)
      .then((r) => r.json() as Promise<Availability>)
      .then((data) => {
        availCache.current.set(activeDay, data);
        setLoadedAvail(data);
      })
      .finally(() => setLoadingDay(null));
  }, [activeDay]);

  const setActive = (d: string) => {
    setActiveDay(d);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (d === "overall") params.delete("day");
      else params.set("day", d);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }
  };

  const currentStats = days.find((d) => d.date === activeDay)?.stats ?? null;
  const isLoading = loadingDay !== null;

  return (
    <>
      <TabStrip overall={overall} days={days} active={activeDay} onSelect={setActive} />

      {activeDay === "overall" || !currentStats ? (
        <>
          <OverallKpis overall={overall} />
          <MultiDayChart overall={overall} />
          <DailyBars daily={overall.daily} onSelect={setActive} />
          <DayHeatmap
            daily={overall.daily}
            hourlyByDay={overall.hourlyByDay}
            onSelect={setActive}
          />
        </>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rappi-red border-t-transparent" />
            <span className="text-sm">Cargando {activeDay}…</span>
          </div>
        </div>
      ) : loadedAvail ? (
        <>
          <KpiCards stats={currentStats} />
          <MainChart key={activeDay} points={loadedAvail.points} date={activeDay} />
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <HourlyBars stats={currentStats} />
            <Heatmap stats={currentStats} />
          </div>
          <TopMoments stats={currentStats} />
        </>
      ) : null}

      <Chatbot key={activeDay} />
    </>
  );
}

export function DashboardSwitcher(props: Props) {
  return (
    <ChatProvider initialDay="overall">
      <div className="space-y-4 sm:space-y-6">
        <Inner {...props} />
      </div>
    </ChatProvider>
  );
}
