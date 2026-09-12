# Etapa 16 — Endpoints y herramientas MCP de progreso

> Análisis funcional previo a implementar. Depende de las
> [Etapas 9 a 11](./roadmap.md) (sesiones registradas, estadísticas y
> progresión de cargas, ya en producción) y tiene la
> **Etapa 6 como prerrequisito duro** (ver abajo). Ver también:
> [`api.md`](./api.md) · [`architecture.md`](./architecture.md) ·
> [`decisions.md`](./decisions.md) · [`roadmap.md`](./roadmap.md) ·
> [`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md)
>
> **Este spec cubre solo la mitad de la Etapa 16 que vive en este repo:**
> el dominio, los dos endpoints de la API y su documentación. Las
> herramientas MCP correspondientes tienen su propio spec, en su propio
> repo: `gym-tracker-mcp/docs/etapa-16-analisis.md`. Se dividió porque un
> agente (o una persona) trabajando en un repo no tiene el `docs/` del
> otro a mano, y porque `gym-tracker-mcp` mantiene su propio
> `decisions.md`/`handoff.md`/`tools.md` que este archivo no puede
> actualizar.

## Objetivo

Hoy un asistente de IA conectado por MCP solo puede leer y reemplazar la
rutina **planificada** (`get_routine` / `replace_routine`). No tiene forma
de saber qué se entrenó de verdad. Esta etapa expone el progreso real —
consistencia y evolución de cargas — en la API pública y como tools MCP,
para que el asistente pueda responder con datos:

- *"¿Cómo vengo con mi rutina?"* → `GET /api/v1/progress/summary`
- *"¿Cómo vengo con press banca?"* → `GET /api/v1/progress/exercises/{nombre}`

Los datos ya existen en Supabase (`training_sessions`, `history`,
`exercise_benchmarks`) y ya se agregan en el frontend para la pantalla de
estadísticas. Esta etapa **no genera datos nuevos**: le da una segunda
salida a los que ya hay.

**Alcance de este spec:** que esos dos endpoints existan, estén
documentados en [`api.md`](./api.md) y sean probables desde el Playground.
Que un asistente MCP los use es el spec del otro repo, y depende de que
esto esté desplegado en producción primero.

## Prerrequisito: cerrar la Etapa 6 primero

Esta etapa **no arranca** hasta que la [Etapa 6](./roadmap.md#etapa-6--endpoints-adicionales-de-la-api-)
esté implementada (`GET /api/v1/routine/summary`,
`POST /api/v1/routine/validate`, y las tools MCP `get_routine_summary` /
`validate_routine` que dependen de ellos). Razones:

1. `/routine/summary` establece el patrón de respuesta de un "summary" en
   esta API. `/progress/summary` tiene que espejarlo, no inventar otro.
2. El servidor MCP tiene hoy dos tools prometidas en el roadmap y no
   implementadas. Sumar dos más antes de cerrar esas deja el adaptador
   con cuatro huecos en vez de dos.
3. `validate` es de esfuerzo casi nulo (envolver `assertValidRoutine`, que
   ya existe).

La Etapa 6 va en su propio spec (`docs/etapa-6-analisis.md`), no acá.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| ¿Cuántos endpoints? | **Dos**: `/progress/summary` (resumen general) y `/progress/exercises/{nombre}` (serie de un ejercicio). El tercero que se evaluó (`/progress/sessions`, listado crudo) queda fuera: es exponer casi toda la tabla sin consumidor real hoy |
| ¿Cómo se pide el rango temporal? | **Query params opcionales** `?from=&to=` (fechas `YYYY-MM-DD`). Sin params, default **últimos 30 días**. Espeja lo que ya hace `pullSessionsInRange` para la pantalla de stats, y permite "¿cómo vine en marzo?" — que las ventanas fijas (`?period=week\|month\|year`) no permiten |
| ¿Dónde vive la lógica de agregación? | **`src/domain/progress.js` (nuevo)**, moviendo lo que hoy está en `src/utils/statsAggregation.js`. Frontend y API llaman la misma función pura, igual que `routine.js` sirve a Excel y a la API. Es la decisión 10 aplicada: si dos transportes necesitan la misma regla, la regla va al dominio |
| ¿Se versiona a `/api/v2`? | **No.** Son endpoints nuevos, aditivos; no cambian la forma de ningún DTO existente. `/api/v1` es el lugar correcto (ver `api.md#compatibilidad-futura`) |
| Forma de la URL del segundo endpoint | Path param de Netlify: `path: '/api/v1/progress/exercises/:name'`, leído con `context.params.name`. **Verificado** contra la doc de Netlify Functions v2 (ver nota de precisión) |
| ¿Cómo se autoriza? | Igual que `routine.js`: `authenticate(request)` → `userId`, y **service role + filtro manual `.eq('user_id', userId)`**, no RLS ni JWT por request (decisión 6). Nunca confiar en RLS desde una Function |
| Rate limiting | Reusa `checkRateLimit(userId)` sin cambios. Mismo bucket de 60 req/min por usuario, compartido con `/routine` — no se le da presupuesto propio a progreso |
| Fuente de "días completados" | Tabla **`history`**, contando **fechas distintas, no filas** — una misma fecha puede tener 2 filas si se completaron 2 días de rutina ese día (ya documentado en `etapa-10-analisis.md` y resuelto por `countDistinctDays`) |
| Fuente de "top ejercicios" y de las series de peso | Tabla **`training_sessions`** (campo `exercises` JSON). `history` no tiene detalle de qué se entrenó |
| Pesos nulos | **Excluidos de las series, nunca graficados ni promediados como 0** — un ejercicio marcado sin peso no es un peso de 0 kg. Mismo criterio que `buildExerciseProgress` hoy |
| Match del nombre de ejercicio | **Exacto y case-sensitive**, igual que el agrupamiento que ya hace el frontend por `exerciseName`. Sin fuzzy match ni normalización: si el asistente manda un nombre que no existe, devuelve `404 EXERCISE_NOT_FOUND` con la lista de nombres disponibles en el rango, para que pueda reintentar |
| Spec de OpenAPI | Generado desde los schemas de Zod de `src/domain/progress.js`, nunca escrito a mano (decisión 11). Los dos endpoints quedan documentados y probables desde el Playground automáticamente |
| ¿Los endpoints escriben? | **No, los dos son `GET`.** Registrar una sesión sigue siendo exclusivo del frontend. Exponer escritura de progreso por API es una decisión de producto aparte, no un detalle de esta etapa |

## Nota de precisión: el import dinámico en `openapiSpec.js`

`netlify/functions/_lib/openapiSpec.js` importa `src/domain/routine.js`
con un **`await import()` dinámico dentro de `buildRegistry()`**, no con
un `import` estático arriba. El comentario del archivo explica por qué:
`extendZodWithOpenApi(z)` tiene que correr **antes** de que se construya
cualquier schema de Zod del proceso, y los imports estáticos de ES modules
se evalúan antes que el cuerpo del archivo.

**`src/domain/progress.js` tiene que seguir exactamente la misma regla.**
Si se agrega como `import { ... } from '../../../src/domain/progress.js'`
arriba del archivo, sus schemas se construyen sin el método `.openapi()`
y el generador falla (o peor: genera un spec incompleto sin avisar).

```js
async function buildRegistry() {
  const { ExerciseSchema, DaySchema, RoutineInputSchema } = await import('../../../src/domain/routine.js')
  const { ProgressSummarySchema, ExerciseProgressSchema } = await import('../../../src/domain/progress.js')
  // ...
}
```

## Nota de precisión: firma del handler y CORS

- Las Functions actuales usan `export default async (request) => {...}`
  con **un solo argumento**. `progress-exercise.js` necesita el
  **segundo**: `async (request, context)`, porque el nombre del ejercicio
  llega en `context.params.name`.
- `CORS_HEADERS` en `_lib/http.js` ya declara
  `'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'`. **`GET` ya está
  incluido — no hay que tocar ese archivo.** Se aclara para que nadie lo
  "arregle" agregando un método que ya está.
- El nombre del ejercicio viaja en la URL y tiene espacios y acentos
  ("Press banca inclinado"). **La Function TIENE que decodificar a mano.**
  Verificado contra producción, no contra la documentación: el handler
  recibe `context.params.name` **percent-encoded**
  (`Press%20banca%20con%20barra`), no decodificado. Sin
  `decodeURIComponent`, el match exacto falla para todo nombre con espacio
  — o sea, para todos — y el endpoint devuelve `404 EXERCISE_NOT_FOUND`
  siempre. El síntoma engaña: parece "no hay datos para ese ejercicio".

  Envolver en `try/catch`: `decodeURIComponent` lanza `URIError` con una
  secuencia mal formada (`%ZZ`, un `%` suelto), y sin capturarlo eso sale
  como `500 INTERNAL_ERROR` en vez de un `400` limpio.

  ```js
  let exerciseName
  try {
    exerciseName = decodeURIComponent(context.params.name)
  } catch {
    throw new HttpError(400, 'INVALID_EXERCISE_NAME', 'El nombre del ejercicio en la URL está mal encodeado.')
  }
  ```

  Quien consuma el endpoint igual tiene que encodear al armar la URL —
  está anotado en el spec del repo del MCP. Las dos mitades hacen falta.

## Fuera de alcance (pospuesto)

- **`GET /api/v1/progress/sessions`** — listado crudo de sesiones. Ver
  tabla de decisiones: no hay consumidor real hoy.
- **Escritura de progreso por API** (registrar una sesión vía `POST`).
  Decisión de producto aparte.
- **Records personales / PRs** (peso máximo histórico por ejercicio,
  detección de récord nuevo). Se puede derivar de la serie que devuelve
  `/progress/exercises/{nombre}`; no se precalcula hasta que alguien lo
  pida.
- **Comparación entre usuarios o benchmarks poblacionales.** Nada de esta
  etapa sale del scope de un solo usuario autenticado.
- **Fuzzy match de nombres de ejercicio.** Ver tabla.
- **Gráficos o renderizado del lado del MCP.** El adaptador devuelve
  datos; quien los grafique es el cliente.
- **Analytics de uso de los endpoints nuevos.** El proyecto no tiene
  stack de analytics y no se agrega uno para esto (mismo criterio que la
  Etapa 15).

## `src/domain/progress.js` (nuevo)

Módulo de dominio: funciones **puras**, sin red, sin React, sin Supabase.
Mismo estilo que `src/domain/routine.js` (JS plano + JSDoc + Zod).

**Se mueve tal cual desde `src/utils/statsAggregation.js`:**
`countDistinctDays`, `topExercises`, `buildExerciseProgress`.

**Se agrega:**

```js
/**
 * Resumen de progreso de un usuario en un rango. Puro: recibe las filas
 * ya leídas, no sabe de dónde vinieron (frontend vía RLS o API vía
 * service role).
 */
export function summarizeProgress({ historyRows, sessionRows, from, to }) { /* ... */ }

/**
 * Serie temporal de peso de UN ejercicio, más su benchmark actual.
 * Devuelve null si no hay ningún punto en el rango — quien llama decide
 * si eso es un 404 (la API) o un empty state (el frontend).
 */
export function buildExerciseSeries({ sessionRows, benchmarkRow, exerciseName }) { /* ... */ }
```

**Schemas de Zod para los DTOs de respuesta** (`ProgressSummarySchema`,
`ExerciseProgressSchema`), en el mismo archivo y con `.openapi()` en los
campos que lo merezcan, para que `openapiSpec.js` los registre igual que
hace con `RoutineInputSchema`.

### DTO de `/progress/summary`

```json
{
  "range": { "from": "2026-08-13", "to": "2026-09-12" },
  "completedDays": 18,
  "sessionsRecorded": 22,
  "lastSessionAt": "2026-09-11T21:04:33.000Z",
  "topExercises": [
    { "name": "Press banca", "count": 12 },
    { "name": "Sentadilla", "count": 11 }
  ],
  "exercisesTracked": 14
}
```

- `completedDays`: fechas distintas en `history` dentro del rango.
- `sessionsRecorded`: filas de `training_sessions` en el rango (puede ser
  mayor que `completedDays`: varias sesiones el mismo día cuentan
  separado).
- `lastSessionAt`: `recorded_at` más reciente del rango, o `null`.
- `topExercises`: `topExercises(sessionRows, 5)`, ya existente.
- `exercisesTracked`: cantidad de nombres distintos con al menos un peso
  registrado en el rango.

### DTO de `/progress/exercises/{nombre}`

```json
{
  "exerciseName": "Press banca",
  "range": { "from": "2026-08-13", "to": "2026-09-12" },
  "currentBenchmarkKg": 72.5,
  "sessionCount": 9,
  "points": [
    { "recordedAt": "2026-08-14T20:11:02.000Z", "weightKg": 70 },
    { "recordedAt": "2026-08-21T19:48:55.000Z", "weightKg": 72.5 }
  ]
}
```

- `currentBenchmarkKg`: de `exercise_benchmarks`, **sin filtrar por
  rango** — es el estado actual, no un dato del período. `null` si no hay.
- `points`: ordenados por `recordedAt` ascendente. Una sesión por punto,
  aunque haya varias el mismo día (criterio ya establecido en
  `etapa-11-analisis.md`).

## `netlify/functions/progress-summary.js` (nuevo)

Calca la estructura de `routine.js`:

```js
export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()
  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)
    if (request.method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }
    // parseRange(request.url) -> { from, to } con default de 30 días
    // dos selects a history y training_sessions filtrados por user_id y rango
    // summarizeProgress(...) -> jsonResponse(200, ...)
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/progress/summary' }
```

- `from`/`to` inválidos (no `YYYY-MM-DD`, o `from > to`) →
  `400 INVALID_RANGE`.
- Sin sesiones ni historial en el rango → **`200` con los contadores en
  cero y `topExercises: []`**, no un 404. Un usuario que todavía no
  entrenó no es un error.
- Error de Supabase → `500 INTERNAL_ERROR`, igual que `routine.js`.

## `netlify/functions/progress-exercise.js` (nuevo)

```js
export default async (request, context) => {
  // ... mismo preámbulo (OPTIONS, authenticate, checkRateLimit, 405)
  const exerciseName = context.params.name
  // select a training_sessions (rango) + exercise_benchmarks (sin rango)
  // buildExerciseSeries(...) -> null => 404 EXERCISE_NOT_FOUND
}

export const config = { path: '/api/v1/progress/exercises/:name' }
```

- Sin datos para ese nombre en el rango → `404 EXERCISE_NOT_FOUND`, y el
  body incluye `availableExercises: [...]` (los nombres que sí tienen
  datos en el rango) vía el tercer argumento `extra` de `HttpError`, que
  ya soporta `routine.js` para `issues`.

## `docs/api.md`

Documentar los dos endpoints con la misma estructura que `/routine`:
método, path, auth, query params, ejemplo de request y de respuesta,
códigos de error. Agregar `INVALID_RANGE` y `EXERCISE_NOT_FOUND` a la
tabla de códigos.

## Cambios en archivos existentes (gym-tracker)

| Archivo | Cambio |
|---|---|
| `src/utils/statsAggregation.js` | **Se borra.** Su contenido se mueve a `src/domain/progress.js` |
| `src/components/StatsView.jsx` | Cambiar el import a `../domain/progress` |
| `src/components/ExerciseProgressChart.jsx` | Cambiar el import a `../domain/progress` |
| `netlify/functions/_lib/openapiSpec.js` | Registrar los dos paths y los schemas nuevos, con **`await import()` dinámico** (ver nota de precisión) |
| `netlify/functions/_lib/http.js` | **Sin cambios** — `GET` ya está en `CORS_HEADERS` |

No se cambia ninguna consulta de `cloudSync.js`: el frontend sigue leyendo
directo de Supabase (decisión 9 — el frontend todavía no consume su propia
API, y esta etapa no lo cambia).

## Contrato para el consumidor (incluido `gym-tracker-mcp`)

Los dos DTOs de acá arriba son **contrato público**, no detalle interno:
`gym-tracker-mcp` los va a espejar, y el día de mañana un SDK o la app
mobile también. Dos consecuencias concretas:

- **Documentarlos en [`api.md`](./api.md) es parte de esta etapa, no un
  extra.** Es la autoridad del contrato: el spec del repo del MCP lo
  referencia en vez de repetir la forma del JSON, justamente para que no
  puedan derivar.
- **No cambiar la forma de estos DTOs después del deploy sin versionar**
  (`/api/v2/...`), igual que ya aplica para `Routine`. Antes del primer
  deploy son libres; después, no.

El `404 EXERCISE_NOT_FOUND` con `availableExercises` existe para el
consumidor, no para el frontend: le permite a un LLM reintentar con un
nombre válido en vez de rendirse. Si se recorta ese campo, la tool del
otro repo pierde su mejor propiedad.

La mitad MCP de la Etapa 16 arranca **después** de que esto esté
desplegado en producción, y está especificada en
`gym-tracker-mcp/docs/etapa-16-analisis.md`.

## Checklist de implementación

- [ ] Cerrar la Etapa 6 antes de arrancar esto (prerrequisito duro).
- [ ] `src/domain/progress.js` — mover las 3 funciones de
      `statsAggregation.js`, agregar `summarizeProgress` y
      `buildExerciseSeries`, más los schemas de Zod de los dos DTOs.
- [ ] Borrar `src/utils/statsAggregation.js` y actualizar los imports en
      `StatsView.jsx` y `ExerciseProgressChart.jsx`.
- [ ] `netlify/functions/progress-summary.js`.
- [ ] `netlify/functions/progress-exercise.js` (handler de **dos**
      argumentos, `context.params.name`).
- [ ] `_lib/openapiSpec.js` — dos paths nuevos + schemas, con
      `await import()` dinámico de `domain/progress.js`.
- [ ] `docs/api.md` — documentar los dos endpoints, sus query params y
      los códigos de error nuevos (`INVALID_RANGE`, `EXERCISE_NOT_FOUND`).
      Es el contrato que consume el otro repo.
- [ ] `npm run lint && npm run build`.
- [ ] Probar con `netlify dev` + `curl`: summary sin params, summary con
      rango, rango inválido (400), ejercicio existente, ejercicio
      inexistente (404 con `availableExercises`), sin API Key (401).
- [ ] Confirmar que la pantalla de estadísticas sigue funcionando igual
      después de mover el módulo (es el riesgo real del refactor, y no hay
      tests que lo cubran).
- [ ] Confirmar que los dos endpoints aparecen en el Playground de Open
      Tracker y se pueden ejecutar desde ahí con la API Key real.
- [ ] `docs/handoff.md` — endpoints nuevos, `domain/progress.js`,
      `statsAggregation.js` fuera de la tabla de funcionalidades.
- [ ] `docs/decisions.md` — ADR nueva: la lógica de stats sube a
      `src/domain/` (cierra la inconsistencia de tenerla en `utils/`), y
      el criterio de match exacto de nombre con `availableExercises` en el
      404.
- [ ] Desplegar a producción. **Recién ahí** arranca
      `gym-tracker-mcp/docs/etapa-16-analisis.md`.
- [ ] `docs/roadmap.md` — marcar la Etapa 16 como ✅ **solo cuando las dos
      mitades estén hechas**, y aclarar en su texto que el spec está
      dividido en dos archivos, uno por repo.
