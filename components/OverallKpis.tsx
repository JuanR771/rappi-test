"use client";

import { motion } from "framer-motion";
import type { Overall } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function OverallKpis({ overall }: { overall: Overall }) {
  const topDay = overall.daily.reduce((a, b) => (b.peak.v > a.peak.v ? b : a));
  const quietDay = overall.daily.reduce((a, b) => (b.avg < a.avg ? b : a));

  const items = [
    {
      label: "Pico global",
      value: formatNum(overall.globalPeak.v),
      sub: `${overall.globalPeak.date} a las ${overall.globalPeak.t}`,
      color: "text-rappi-red",
      border: "border-rappi-red/30",
    },
    {
      label: "Valle global",
      value: formatNum(overall.globalValley.v),
      sub: `${overall.globalValley.date} a las ${overall.globalValley.t}`,
      color: "text-rappi-pink",
      border: "border-rappi-pink/30",
    },
    {
      label: "Promedio global",
      value: formatNum(overall.globalAvg),
      sub: `${overall.totalDays} días · ${formatNum(overall.totalPoints)} puntos`,
      color: "text-rappi-amber",
      border: "border-rappi-amber/30",
    },
    {
      label: "Día más alto / más flojo",
      value: `${topDay.date.slice(5)} · ${quietDay.date.slice(5)}`,
      sub: `pico ${formatNum(topDay.peak.v)} · avg ${formatNum(quietDay.avg)}`,
      color: "text-rappi-coral",
      border: "border-rappi-coral/30",
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className={`rounded-xl border ${it.border} bg-zinc-900/50 p-4 backdrop-blur`}
        >
          <div className="text-xs uppercase tracking-wider text-zinc-400">{it.label}</div>
          <div
            className={`mt-2 ${it.small ? "text-sm sm:text-base" : "text-2xl sm:text-3xl"} font-bold ${it.color}`}
          >
            {it.value}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{it.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
