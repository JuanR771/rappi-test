# Rappi · Dashboard de Disponibilidad de Tiendas

Prueba técnica **RappiMakers 2026**. Dashboard web con chatbot AI sobre la métrica `synthetic_monitoring_visible_stores`.

## Stack

- **Next.js 16** (App Router) — frontend + API routes en un solo proceso.
- **Tailwind 4** + componentes custom (dark mode por defecto).
- **Recharts** para los gráficos · **Framer Motion** para animaciones sutiles.
- **Vercel AI SDK 6** con **Gemini 2.5 Flash** (fallback automático a **Groq Llama 3.3 70B**).
- **Tool-calling** (no RAG) — el LLM consulta el dataset vía funciones tipadas con Zod.
- **TypeScript** estricto.

## Setup

```bash
# 1. Instalar
npm install

# 2. Ingresar API key de Gemini
echo 'GOOGLE_GENERATIVE_AI_API_KEY=tu_api_key_aqui' > .env.local

# 3. (Opcional) Fallback a Groq ante rate-limits de Gemini:
# echo 'GROQ_API_KEY=tu_groq_key' >> .env.local

# 4. Correr
npm run dev
# → http://localhost:3000
```

Los JSONs pre-agregados ya están commiteados en `public/data/`, así que no hace falta regenerarlos para correr la app.

## El dataset

- **Métrica única**: `synthetic_monitoring_visible_stores` (plot name: `NOW`).
- **Cobertura**: **11 días** (2026-02-01 → 2026-02-11, hora Colombia) · snapshot cada 10s.
- **Puntos únicos**: ~67.000 a lo largo de los 11 días (después de consolidar duplicados).
- **Pico global**: **6.198.472 tiendas** el viernes **2026-02-06 a las 16:01:10**.
- **Valle**: varios días tocan 0 al inicio (06:11:20).
- **Patrón semanal**: la media diaria sube de lunes a viernes (2.62M → 3.72M) y cae el fin de semana (domingo ≈ 2.74M).
- **Día parcial**: el 11-02 tiene cobertura solo hasta 15:00. El pipeline lo marca `partial: true` y el dashboard lo destaca.

Los CSVs vienen en formato "wide" (~360 columnas de tiempo, ~1 hora por archivo). El script `prepare-data.ts` los pivota a formato long `(timestamp, value)`, los segmenta por fecha Bogotá (UTC-5), toma el **MAX por timestamp** para resolver snapshots solapados de Splunk, y precalcula agregados por día más agregados globales multi-día.

## Tools del chatbot

13 tools deterministas, todas tipadas con Zod (input y output). El LLM nunca inventa números: los pide a estas funciones.

### Multi-día

| Tool | Uso |
|---|---|
| `listAvailableDays` | Lista los 11 días con su resumen (pico, valle, avg) |
| `getDailySummary(day)` | Resumen completo de un día específico |
| `compareDays(dayA, dayB)` | Compara dos días: diferencia absoluta y % en pico, valle y avg |
| `hourAcrossDays(hour)` | Cómo estuvo una hora a lo largo de todos los días |

### Dentro de un día

| Tool | Uso |
|---|---|
| `getValueAt(time, day)` | Valor en un timestamp específico |
| `getRangeStats(from, to, day)` | Min/max/avg en un rango horario |
| `getTopMoments(n, day)` | Los N picos del día |
| `getHourlyAverage(hour, day)` | Avg/mediana/pico/valle de una hora completa |
| `compareHoursTool(hourA, hourB, day)` | Compara dos horas del mismo día |
| `describeRangeTool(from, to, day)` | Tendencia, delta y % de cambio en un rango |
| `biggestDropsTool(n, day)` | Las N caídas consecutivas más grandes |
| `biggestRisesTool(n, day)` | Las N subidas consecutivas más grandes |
| `findAnomaliesTool(sigma, day)` | Puntos anómalos (outliers a >N sigmas) |

## Estructura

```
rappi-test/
├── app/
│   ├── page.tsx                # Dashboard (server component)
│   ├── api/chat/route.ts       # streamText + tools + SSE + fallback
│   ├── api/day/[date]/route.ts # Carga lazy del día seleccionado
│   └── layout.tsx
├── components/
│   ├── DashboardSwitcher.tsx   # Tabs overall + por día
│   ├── OverallKpis.tsx         # KPIs multi-día
│   ├── KpiCards.tsx            # KPIs por día
│   ├── MultiDayChart.tsx       # AreaChart de los 11 días
│   ├── MainChart.tsx           # AreaChart por día con filtros
│   ├── DailyBars.tsx           # BarChart comparando días
│   ├── HourlyBars.tsx          # BarChart por hora
│   ├── Heatmap.tsx             # Grid multi-día
│   ├── DayHeatmap.tsx          # Grid por día
│   ├── TopMoments.tsx          # Tabla top-N
│   ├── ExplainButton.tsx       # Botón "Explicar con AI" compartido
│   ├── ChatContext.tsx         # Bridge charts ↔ chatbot
│   └── Chatbot.tsx             # UI del chat (useChat) + tool-trace expandible
├── lib/
│   ├── data.ts                 # Loaders con caché a nivel de módulo
│   ├── stats.ts                # Agregados puros (sin deps de React)
│   └── tools.ts                # 13 tools Zod-tipadas
├── scripts/
│   └── prepare-data.ts         # Pipeline offline (segmenta + MAX + agrega)
├── public/data/
│   ├── index.json              # Metadata de los 11 días
│   ├── overall.json            # Agregado multi-día (pico global, avg, etc.)
│   └── days/<date>/
│       ├── availability.json   # Puntos del día
│       └── stats.json          # Agregados del día
└── data/raw/                   # CSVs originales (gitignored)
```

## Uso de AI en el proceso de desarrollo

- **Claude Opus** para decisiones de diseño (tool-calling vs RAG, MAX por timestamp, monolito vs microservicios, stack).
- **Claude Code** para explorar el dataset, refactorizar y generar boilerplate de componentes.
- **Gemini 2.5 Flash** como motor del chatbot en runtime (con fallback a Groq Llama 3.3 70B ante 429).
- **Skills `/security-review` y `/simplify`** como pasada final pre-entrega sobre los cambios.
