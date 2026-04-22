"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useChatBridge } from "./ChatContext";

const SUGGESTIONS_DAY = [
  "¿A qué hora fue el pico del día?",
  "Compara las 10 AM vs las 4 PM",
  "¿Cuál fue la caída más brusca?",
  "¿Qué pasó entre las 14:00 y las 16:00?",
];
const SUGGESTIONS_OVERALL = [
  "¿Qué día tuvo el pico más alto?",
  "Compara el lunes 2 vs el sábado 7",
  "¿Cómo estuvo la hora 16 durante la semana?",
  "Resumen de los 11 días",
];

const QUICK_CHIPS_DAY = [
  "¿Pico del día?",
  "¿Caída más brusca?",
  "Compara 10 AM vs 4 PM",
  "¿Hubo anomalías?",
  "¿Cómo estuvo la tarde?",
];
const QUICK_CHIPS_OVERALL = [
  "¿Día con mayor pico?",
  "¿Día más flojo?",
  "Hora 16 durante la semana",
  "Lista de días disponibles",
];

export function Chatbot() {
  const { pending, consumePending, registerChatRef, activeDay, activeDayRef } = useChatBridge();
  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ day: activeDayRef.current }),
    }),
  ).current;
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOverall = activeDay === "overall";
  const focusLabel = isOverall ? "Vista general (11 días)" : `Día ${activeDay}`;
  const suggestions = isOverall ? SUGGESTIONS_OVERALL : SUGGESTIONS_DAY;
  const quickChips = isOverall ? QUICK_CHIPS_OVERALL : QUICK_CHIPS_DAY;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (pending && !busy) {
      sendMessage({ text: pending });
      consumePending();
    }
  }, [pending, busy, sendMessage, consumePending]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div
      ref={registerChatRef}
      className="flex h-[70vh] min-h-[480px] flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur md:h-[600px]"
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 p-3 sm:p-4">
        <div className="h-2 w-2 animate-pulse rounded-full bg-rappi-red" />
        <h2 className="text-base font-bold text-zinc-100 sm:text-lg">
          💬 Asistente de datos
        </h2>
        <span className="ml-2 rounded-full border border-rappi-amber/40 bg-rappi-amber/10 px-2 py-0.5 text-[10px] text-rappi-amber sm:text-xs">
          Hablando sobre: {focusLabel}
        </span>
        <span className="ml-auto hidden text-[10px] text-zinc-500 sm:inline sm:text-xs">Gemini 2.5 Flash · Groq fallback</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex h-full flex-col items-center justify-center gap-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-4xl"
            >
              🤖
            </motion.div>
            <p className="text-sm text-zinc-400">
              {isOverall
                ? "Pregúntame sobre cualquier día o compara entre días."
                : `Pregúntame sobre los datos del ${activeDay}.`}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                  onClick={() => submit(s)}
                  className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-rappi-red/60 hover:text-rappi-red"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const text = m.parts
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("");
            const toolCalls = m.parts.filter((p) => p.type.startsWith("tool-"));
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[85%] ${
                    m.role === "user"
                      ? "bg-rappi-red/20 text-orange-50"
                      : "bg-zinc-800/80 text-zinc-100"
                  }`}
                >
                  {toolCalls.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {toolCalls.map((tc, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-rappi-amber/40 bg-rappi-amber/10 px-2 py-0.5 font-mono text-[10px] text-rappi-amber"
                        >
                          🔧 {tc.type.replace("tool-", "")}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{text || (busy ? "…" : "")}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {busy && messages[messages.length - 1]?.role === "user" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="rounded-2xl bg-zinc-800/80 px-4 py-2.5 text-sm text-zinc-400">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
              </span>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="rounded-lg border border-rappi-pink/40 bg-rappi-pink/10 p-3 text-xs text-rappi-pink">
            {/quota|rate.?limit|429/i.test(error.message) && /exceeded/i.test(error.message)
              ? "Se agotó la cuota del proveedor. Intenta de nuevo en unos minutos."
              : /failed to call a function/i.test(error.message)
                ? "El modelo generó una llamada inválida (error transitorio). Reintenta la misma pregunta."
                : `Error: ${error.message}`}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-t border-zinc-800 px-3 pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickChips.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              disabled={busy}
              className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400 transition hover:border-rappi-red/60 hover:text-rappi-red disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className={`flex gap-2 p-3 ${messages.length > 0 ? "" : "border-t border-zinc-800"}`}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe una pregunta…"
          disabled={busy}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rappi-red focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-rappi-red px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
