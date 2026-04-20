"use client";

import { motion } from "framer-motion";
import type { Stats } from "@/lib/data";

function formatNum(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function KpiCards({ stats }: { stats: Stats }) {
  const items = [
    {
      label: "Pico del día",
      value: formatNum(stats.peak.v),
      sub: `a las ${stats.peak.t}`,
      color: "text-rappi-red",
      border: "border-rappi-red/30",
    },
    {
      label: "Valle del día",
      value: formatNum(stats.valley.v),
      sub: `a las ${stats.valley.t}`,
      color: "text-rappi-pink",
      border: "border-rappi-pink/30",
    },
    {
      label: "Promedio",
      value: formatNum(stats.avg),
      sub: `${stats.totalPoints} puntos`,
      color: "text-rappi-amber",
      border: "border-rappi-amber/30",
    },
    {
      label: "Cobertura",
      value: `${stats.coverage.first} → ${stats.coverage.last}`,
      sub: `${stats.date} · cada ${stats.granularitySec}s`,
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
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            {it.label}
          </div>
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
