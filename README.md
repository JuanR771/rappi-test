# Rappi · Dashboard de Disponibilidad de Tiendas

Prueba técnica **RappiMakers 2026**. Dashboard web con chatbot AI sobre la métrica `synthetic_monitoring_visible_stores`.

## Stack

- **Next.js 16** (App Router) — frontend + API routes en un solo proceso.
- **Tailwind 4** + componentes custom (dark mode por defecto).
- **Recharts** para los gráficos.
- **Vercel AI SDK 6** con **Gemini 2.0 Flash** (fallback a **Groq Llama 3.3 70B**).
- **Tool-calling** (no RAG) — el LLM consulta el dataset vía funciones tipadas con Zod.
- **TypeScript** estricto.

## Arquitectura

```
┌── Cliente (navegador) ─────────────────────────────┐
│  Dashboard (Server Component) + Chatbot UI        │
└────────────────┬───────────────────────────────────┘
                 │ HTTP + SSE
                 ▼
┌── Next.js Server (localhost:3000) ─────────────────┐
│  /api/chat  ──► streamText + tools  ──► Gemini API │
│  /          ──► sirve HTML + stats.json            │
│  lib/tools.ts  (getValueAt, rangeStats,            │
│                 topMoments, compareHours, ...)     │
└────────────────▲───────────────────────────────────┘
                 │
┌── scripts/prepare-data.ts (offline, 1 vez) ────────┐
│  201 CSVs ─► consolida ─► availability.json        │
│              (MAX por timestamp)  + stats.json     │
└────────────────────────────────────────────────────┘
```

## Setup

```bash
# 1. Instalar
npm install

# 2. Crear API key de Gemini (gratis, sin tarjeta)
#    https://aistudio.google.com/apikey
echo 'GOOGLE_GENERATIVE_AI_API_KEY=tu_api_key_aqui' > .env.local

# 3. (Opcional) Para usar Groq en vez de Gemini:
# echo 'LLM_PROVIDER=groq' >> .env.local
# echo 'GROQ_API_KEY=tu_groq_key' >> .env.local

# 4. Regenerar los JSON de datos (ya existen, esto solo si cambias el zip)
npx tsx scripts/prepare-data.ts

# 5. Correr
npm run dev
# → http://localhost:3000
```

## Decisiones clave (para la presentación)

1. **Tool-calling vs RAG**: el dataset es numérico-temporal, no texto. Tools deterministas (`getRangeStats`, `topMoments`, etc.) son más precisas y auditables que embeddings.
2. **Pipeline offline**: los 201 CSVs se consolidan **una sola vez** en `prepare-data.ts` → `availability.json` (6452 puntos). La app nunca re-parsea CSVs en runtime.
3. **MAX por timestamp**: los CSVs son ~10 snapshots por hora con pequeñas diferencias (late-arriving data de Splunk). Tomar el MAX equivale al snapshot más completo.
4. **Gemini 2.0 Flash**: gratis, 1M tokens de contexto, tool-calling confiable. Fallback a Groq via env var.
5. **Monolito Next.js**: un solo proceso, un solo `npm run dev`. Sin complejidad de microservicios.

## El dataset

- **Métrica única**: `synthetic_monitoring_visible_stores` (plot name: `NOW`).
- **Día**: 2026-02-01 (domingo).
- **Cobertura**: 06:11:20 → 00:06:30 (hora Colombia) cada 10s → **6452 puntos únicos**.
- **Pico**: 6.198.472 a las 16:01:10.
- **Valle**: 82 a las 06:11:20.
- **Forma**: campana con arranque de día, pico al final de la tarde, declive nocturno.

Cada CSV cubre ~1 hora (~363 columnas de tiempo) en formato "wide". El script `prepare-data.ts` pivota a formato long `(timestamp, value)`, consolida snapshots y precalcula agregados.

## Tools del chatbot

| Tool | Uso |
|---|---|
| `getValueAt(time)` | Valor en un timestamp específico |
| `getRangeStats(from, to)` | Min/max/avg en un rango horario |
| `getTopMoments(n)` | Los N picos del día |
| `compareHoursTool(a, b)` | Compara dos horas |
| `biggestDropsTool(n)` | Las N caídas más grandes |
| `biggestRisesTool(n)` | Las N subidas más grandes |

## Estructura

```
rappi-test/
├── app/
│   ├── page.tsx                # Dashboard (server component)
│   ├── api/chat/route.ts       # streamText + tools
│   └── layout.tsx
├── components/
│   ├── KpiCards.tsx            # 4 KPIs
│   ├── MainChart.tsx           # AreaChart + filtros
│   ├── HourlyBars.tsx          # BarChart por hora
│   ├── Heatmap.tsx             # grid de intensidad
│   ├── TopMoments.tsx          # tabla top-5
│   └── Chatbot.tsx             # UI del chat (useChat)
├── lib/
│   ├── data.ts                 # loaders con cache
│   ├── stats.ts                # agregados, resample
│   └── tools.ts                # tools Zod-tipadas
├── scripts/
│   └── prepare-data.ts         # pipeline offline
├── public/data/
│   ├── availability.json       # 6452 puntos
│   └── stats.json              # agregados
└── data/raw/                   # 201 CSVs originales (gitignored)
```

## Uso de AI en el proceso de desarrollo

- **Claude Code** para explorar el dataset, diseñar la arquitectura y generar el boilerplate de componentes.
- **Claude Opus** para decisiones de diseño (tool-calling vs RAG, stack, trade-offs).
- **Gemini 2.0 Flash** como motor del chatbot en runtime.
