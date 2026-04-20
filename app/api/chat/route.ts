import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, stepCountIs } from "ai";
import { loadStats } from "@/lib/data";
import { dataTools } from "@/lib/tools";

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

function buildSystem(stats: ReturnType<typeof loadStats>) {
  const fmt = (n: number) => n.toLocaleString("es-CO");
  return `Eres un analista de datos conciso que responde en español sobre la métrica de Rappi "synthetic_monitoring_visible_stores" (número de tiendas visibles reportado por monitoreo sintético) del día 2026-02-01.

Contexto del dataset:
- Día: ${stats.date}
- Cobertura: ${stats.coverage.first} → ${stats.coverage.last} (hora Colombia)
- Granularidad: cada ${stats.granularitySec}s
- Total de puntos: ${stats.totalPoints}
- Pico del día: ${fmt(stats.peak.v)} a las ${stats.peak.t}
- Valle: ${fmt(stats.valley.v)} a las ${stats.valley.t}
- Promedio: ${fmt(stats.avg)}

Reglas:
1. Usa SIEMPRE las tools para cualquier pregunta que requiera valores específicos, rangos, comparaciones o anomalías. NUNCA inventes números.
2. Si la pregunta NO puede responderse con las tools disponibles o está fuera del alcance del dataset (ej. causas, tiendas específicas, otros días, datos externos), responde claramente: "No tengo datos para responder eso. Puedo ayudarte con: picos, valles, comparaciones por hora, caídas/subidas, anomalías y resúmenes de rangos."
3. Formatea números grandes con separador de miles (ej: 6.198.472).
4. Responde breve (máximo 3 frases) a menos que pidan detalle explícito.
5. Responde siempre en español.

Ejemplos de mapeo pregunta → tool:
- "¿a qué hora fue el pico?" → getTopMoments({ n: 1 })
- "top 5 momentos" → getTopMoments({ n: 5 })
- "qué pasó entre las 10 y las 12" → describeRangeTool({ from: "10:00", to: "12:00" })
- "cómo estuvo la tarde" → describeRangeTool({ from: "12:00", to: "18:00" })
- "cómo estuvo la hora 15" → getHourlyAverage({ hour: "15" })
- "compara 10 AM vs 4 PM" → compareHoursTool({ hourA: "10", hourB: "16" })
- "caída más brusca" → biggestDropsTool({ n: 1 })
- "subidas más fuertes" → biggestRisesTool({ n: 5 })
- "valor a las 14:30" → getValueAt({ time: "14:30" })
- "hubo anomalías" → findAnomaliesTool({ sigma: 2 })
- "estadísticas entre X e Y" → getRangeStats({ from, to })`;
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|rate.?limit|exceeded/i.test(msg);
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const stats = loadStats();
  const system = buildSystem(stats);
  const modelMessages = await convertToModelMessages(messages);

  async function attempt(model: ReturnType<typeof getPrimaryModel>) {
    const result = streamText({
      model,
      system,
      messages: modelMessages,
      tools: dataTools,
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
