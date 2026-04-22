import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, stepCountIs } from "ai";
import { loadIndex, loadOverall, loadStats } from "@/lib/data";
import { buildDataTools } from "@/lib/tools";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function resolveProvider(): "groq" | "google" {
  const explicit = process.env.LLM_PROVIDER;
  if (explicit === "groq" || explicit === "google") return explicit;
  return "google";
}

function getPrimaryModel() {
  return resolveProvider() === "groq" ? groq(GROQ_MODEL) : google(GEMINI_MODEL);
}

function getFallbackModel() {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const provider = resolveProvider();
  if (provider === "google" && hasGroq) return groq(GROQ_MODEL);
  if (provider === "groq" && hasGoogle) return google(GEMINI_MODEL);
  return null;
}

function fmt(n: number) {
  return n.toLocaleString("es-CO");
}

function buildSystem(activeDay: string) {
  const index = loadIndex();
  const overall = loadOverall();
  const daysList = index.days
    .map(
      (d) =>
        `  - ${d.date} (${d.weekday})${d.partial ? " [parcial]" : ""}: peak ${fmt(
          d.peak.v,
        )} @ ${d.peak.t}, avg ${fmt(d.avg)}, cobertura ${d.coverage.first}–${d.coverage.last}`,
    )
    .join("\n");

  const focus =
    activeDay === "overall"
      ? `Foco actual: VISTA GENERAL (los 11 días juntos). Para responder sobre un día concreto, pasa el parámetro \`day\` a las tools o recomienda al usuario que seleccione el día en el dashboard.`
      : (() => {
          const s = loadStats(activeDay);
          return `Foco actual: ${s.date} (${s.weekday}). Si el usuario no especifica día, asume este día. Resumen:
  - cobertura ${s.coverage.first}–${s.coverage.last}${s.partial ? " (PARCIAL)" : ""}
  - pico ${fmt(s.peak.v)} @ ${s.peak.t}
  - valle ${fmt(s.valley.v)} @ ${s.valley.t}
  - promedio ${fmt(s.avg)}
  - total puntos ${s.totalPoints}`;
        })();

  return `Eres un analista de datos conciso que responde en español sobre la métrica de Rappi "synthetic_monitoring_visible_stores" (número de tiendas visibles reportado por monitoreo sintético, granularidad ${overall.granularitySec}s).

Dataset:
- ${overall.totalDays} días disponibles (${index.days[0].date} → ${index.days[index.days.length - 1].date}):
${daysList}
- Pico global: ${fmt(overall.globalPeak.v)} @ ${overall.globalPeak.date} ${overall.globalPeak.t}
- Valle global: ${fmt(overall.globalValley.v)} @ ${overall.globalValley.date} ${overall.globalValley.t}
- Promedio global: ${fmt(overall.globalAvg)}

${focus}

Reglas:
1. Usa SIEMPRE las tools para cualquier pregunta que requiera valores específicos, rangos, comparaciones o anomalías. NUNCA inventes números.
2. Si el usuario pregunta por un día y da una fecha o referencia (ej "lunes 9", "el sábado", "ayer"), convierte a YYYY-MM-DD y pásalo en el parámetro \`day\`. Si dudas, llama primero \`listAvailableDays\`.
3. Si el usuario no especifica día y hay foco activo, úsalo. Si el foco es "overall" y la pregunta es sobre un solo día, pide aclaración o usa \`listAvailableDays\`.
4. Si la pregunta está fuera del alcance (causas, tiendas específicas, datos externos), responde: "No tengo datos para responder eso. Puedo ayudarte con: picos, valles, comparaciones por hora/día, caídas/subidas, anomalías y resúmenes de rangos."
5. Formatea números grandes con separador de miles (ej: 6.198.472).
6. Responde breve (máximo 3 frases) a menos que pidan detalle.
7. Responde siempre en español.

Ejemplos:
- "¿qué día tuvo el pico más alto?" → listAvailableDays → responde con fecha y hora.
- "compara el lunes 2 vs el sábado 7" → compareDays({ dayA: "2026-02-02", dayB: "2026-02-07" })
- "cómo estuvo la hora 16 durante la semana" → hourAcrossDays({ hour: "16" })
- "a qué hora fue el pico" (con foco activo) → getTopMoments({ n: 1 })
- "top 5 momentos del 5 de feb" → getTopMoments({ n: 5, day: "2026-02-05" })
- "compara 10 AM vs 4 PM" → compareHoursTool({ hourA: "10", hourB: "16" })
- "caída más brusca" → biggestDropsTool({ n: 1 })
- "valor a las 14:30" → getValueAt({ time: "14:30" })
- "hubo anomalías" → findAnomaliesTool({ sigma: 2 })
- "qué pasó entre las 10 y las 12" → describeRangeTool({ from: "10:00", to: "12:00" })`;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|rate.?limit|exceeded/i.test(msg);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, day } = body as { messages: unknown; day?: string };
  const activeDay = typeof day === "string" && day.length > 0 ? day : "overall";
  const system = buildSystem(activeDay);
  const modelMessages = await convertToModelMessages(messages as never);
  const tools = buildDataTools(activeDay);

  async function attempt(model: ReturnType<typeof getPrimaryModel>) {
    const result = streamText({
      model,
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
    });
    return result.toUIMessageStreamResponse();
  }

  try {
    return await attempt(getPrimaryModel());
  } catch (err) {
    if (isRateLimit(err)) {
      const fallback = getFallbackModel();
      if (fallback) {
        console.warn("[chat] Primary rate-limited, falling back");
        try {
          return await attempt(fallback);
        } catch (err2) {
          const msg = err2 instanceof Error ? err2.message : String(err2);
          return new Response(JSON.stringify({ error: `Fallback también falló: ${msg}` }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
