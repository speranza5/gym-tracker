# Open Tracker API — v1

> Ver también: [`README.md`](../README.md) · [`architecture.md`](./architecture.md) · [`decisions.md`](./decisions.md)

Open Tracker es la API pública de Gym Tracker: permite que agentes de IA,
scripts y futuras integraciones (incluyendo el futuro servidor MCP
`gym-tracker-mcp`) lean y actualicen la rutina de un usuario.

- **Base URL:** `https://gym-tracker.carlossperanza.fyi/api/v1`
- **Formato:** JSON sobre HTTPS.
- **Versionado:** el path incluye la versión (`/api/v1/...`). Un cambio
  incompatible se publica como `/api/v2/...` sin tocar `/api/v1`, así que
  los clientes existentes nunca se rompen por una evolución futura.

## Documentación interactiva

- **Spec máquina:** `GET /api/v1/openapi.json` — documento OpenAPI 3.0,
  público (sin autenticación), generado en cada request desde los mismos
  schemas de [Zod](https://zod.dev/) que validan `PUT /api/v1/routine`
  (`src/domain/routine.js` + `netlify/functions/_lib/openapiSpec.js`, vía
  [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi)).
  No hay un spec mantenido a mano por separado — por construcción no puede
  divergir del código que realmente valida los requests.
- **Playground:** dentro de la app, menú lateral → **Open Tracker** →
  Developer Resources → **API Playground** (una vez logueado). Renderiza
  ese mismo spec con [Scalar](https://github.com/scalar/scalar)
  (`@scalar/api-reference-react`), pre-autenticado con tu propia API Key —
  se puede explorar y **ejecutar requests reales** sin copiar/pegar nada.
  Ver la decisión de por qué Scalar y no Swagger UI/Redoc en
  [`decisions.md`](./decisions.md#12-scalar-en-vez-de-swagger-ui-para-el-playground).

Esta referencia escrita (`api.md`) y el Playground **se complementan**: acá
hay contexto y explicaciones en prosa; el Playground es para explorar y
probar interactivamente. No se duplica información a propósito — los
ejemplos de `curl` de abajo son para quien lee este archivo sin abrir la
app; la pantalla "Quick Start" de Open Tracker tiene los mismos ejemplos
pero con tu Base URL y tu API Key reales ya completadas.

## Autenticación

Cada usuario de Gym Tracker tiene una única API Key (visible en la app, menú
lateral → **Open Tracker**, una vez logueado). No expira; se puede regenerar
desde esa misma pantalla (botón "Regenerar API Key", con confirmación) — ver
[Regeneración de API Key](#regeneración-de-api-key).

Se envía en cada request como header `Authorization`:

```
Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Requests sin ese header, o con una key que no existe, devuelven `401`.
Los usuarios anónimos (sin API Key) no tienen forma de acceder a esta API.

**Estrategia de autenticación (detalle interno):** la Function resuelve el
`user_id` dueño de la API Key consultando la tabla `api_keys` con la
*service role key* de Supabase (no con Row Level Security) — la Function
misma es responsable de filtrar todo por ese `user_id`. Ver
[`decisions.md`](./decisions.md#6-cómo-autentica-la-api-contra-supabase)
para el razonamiento completo.

## DTOs públicos

El contrato de la API es el DTO `Routine` de abajo — **no** es un espejo
1:1 de la tabla `routines` de Postgres (no expone `user_id`, y `updatedAt`
es camelCase aunque la columna sea `updated_at`). Esta capa de traducción
(`toRoutineRow` / `fromRoutineRow` en `src/domain/routine.js`) es lo que
permite que la persistencia evolucione (cambiar de motor, renombrar
columnas, particionar tablas) sin romper a los clientes de la API.

## Modelo de datos

```
Exercise
├─ id           string   identificador único del ejercicio dentro del día
├─ name         string   nombre del ejercicio (requerido)
├─ block        string   bloque/sección (ej: "Tren superior"), puede venir vacío
├─ series       string   series (ej: "4"), texto libre
├─ repsTime     string   reps o tiempo (ej: "10" o "45 seg"), texto libre
└─ description  string   notas opcionales

Day
├─ id           string   identificador único del día dentro de la rutina (requerido)
├─ name         string   nombre del día (ej: "Día 1"), (requerido)
└─ exercises    Exercise[]

Routine
├─ fileName     string | null   nombre descriptivo, opcional
├─ days         Day[]           requerido, no puede estar vacío
└─ updatedAt    string (ISO 8601)  solo en las respuestas, no se envía en el PUT
```

`id` de días y ejercicios son solo identificadores de texto (no tienen que
ser UUIDs) — alcanza con que sean únicos dentro de la rutina que se envía.

## Endpoints

### `GET /api/v1/routine`

Devuelve la rutina completa del usuario autenticado.

**Propósito:** leer la rutina actual, tal como la vería el usuario en la app.

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** ninguno (ni query params ni body). El usuario se resuelve
100% a partir de la API Key.

**Request**

```bash
curl https://gym-tracker.carlossperanza.fyi/api/v1/routine \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response `200 OK`**

```json
{
  "fileName": "rutina.xlsx",
  "days": [
    {
      "id": "d0",
      "name": "Día 1",
      "exercises": [
        {
          "id": "d0-e1",
          "name": "Press banca",
          "block": "Tren superior",
          "series": "4",
          "repsTime": "10",
          "description": ""
        }
      ]
    }
  ],
  "updatedAt": "2026-07-26T14:32:10.000Z"
}
```

**Response `404 Not Found`** — el usuario todavía no cargó ninguna rutina:

```json
{ "error": { "code": "ROUTINE_NOT_FOUND", "message": "Todavía no hay una rutina cargada para este usuario." } }
```

### `PUT /api/v1/routine`

Reemplaza **completamente** la rutina actual por la que se envía en el body.
No hay modificaciones parciales — si un día o ejercicio no está en el body,
deja de existir en la rutina guardada.

**Propósito:** subir/reemplazar la rutina completa (equivalente a lo que
hace la app al parsear un Excel nuevo, pero vía HTTP).

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** body JSON, `Content-Type: application/json`.

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `fileName` | `string \| null` | No | Nombre descriptivo, solo informativo. |
| `days` | `Day[]` | **Sí** | No puede estar vacío. Reemplaza toda la rutina. |
| `days[].id` | `string` | **Sí** | Único dentro de la rutina. |
| `days[].name` | `string` | **Sí** | |
| `days[].exercises` | `Exercise[]` | **Sí** | Puede estar vacío en teoría, pero un día sin ejercicios no tiene sentido práctico. |
| `days[].exercises[].id` / `.name` | `string` | **Sí** | Únicos dentro del día. |
| `days[].exercises[].block` / `.series` / `.repsTime` / `.description` | `string` | No | Texto libre, default `""`. |

**Request**

```bash
curl -X PUT https://gym-tracker.carlossperanza.fyi/api/v1/routine \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "rutina-actualizada.xlsx",
    "days": [
      {
        "id": "d0",
        "name": "Día 1",
        "exercises": [
          { "id": "d0-e1", "name": "Sentadilla", "block": "Tren inferior", "series": "4", "repsTime": "8" }
        ]
      }
    ]
  }'
```

**Response `200 OK`** — la rutina ya guardada, en el mismo formato que `GET`.

**Response `400 Bad Request`** — el body no cumple la forma de una rutina válida:

```json
{
  "error": {
    "code": "INVALID_ROUTINE",
    "message": "Rutina inválida: \"days\" debe ser un array con al menos un día",
    "issues": ["\"days\" debe ser un array con al menos un día"]
  }
}
```

### `GET /api/v1/routine/summary`

Devuelve un resumen liviano de la rutina: conteos, bloques y detalle por
día, sin el detalle ejercicio por ejercicio. Pensado para "¿qué tengo?"
sin bajar el DTO completo.

**Propósito:** que un agente o integración conozca la forma de la rutina
(para después pedir el detalle con `GET`, o validar un reemplazo con
`POST .../validate`) con una respuesta chica.

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** ninguno (ni query params ni body). El usuario se resuelve
100% a partir de la API Key.

**Request**

```bash
curl https://gym-tracker.carlossperanza.fyi/api/v1/routine/summary \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response `200 OK`**

```json
{
  "fileName": "rutina.xlsx",
  "updatedAt": "2026-07-26T14:32:10.000Z",
  "dayCount": 3,
  "exerciseCount": 18,
  "blocks": [
    { "name": "Tren superior", "exerciseCount": 8 },
    { "name": null, "exerciseCount": 2 }
  ],
  "days": [
    { "id": "d0", "name": "Día 1", "exerciseCount": 6 }
  ]
}
```

- `blocks` agrupa por bloque en orden de primera aparición; `name: null`
  es el bucket de ejercicios sin bloque (el campo es opcional). La suma de
  `blocks[].exerciseCount` siempre coincide con `exerciseCount`.
- `days[].exerciseCount` es la cantidad de ejercicios de ese día.

**Response `404 Not Found`** — igual que el `GET`: el usuario todavía no
cargó ninguna rutina. A propósito distinto del `/progress/summary` de
progreso (ver [`etapa-6-analisis.md`](./etapa-6-analisis.md#nota-anti-armonización-404-acá-200-con-ceros-en-la-etapa-16)):
no tener rutina es la ausencia del recurso; no haber entrenado todavía es
un cero legítimo.

### `POST /api/v1/routine/validate`

Valida un payload de rutina **sin guardarlo**. Mismo body que el `PUT`,
misma función de dominio (`assertValidRoutine`) — la diferencia es que
nunca escribe.

**Propósito:** que un asistente verifique un payload antes de reemplazar
la rutina real con `PUT` (o corrija y reintente, usando `issues`).

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** body JSON, `Content-Type: application/json`, con la misma
forma que el `PUT` (`fileName` opcional, `days` requerido no vacío).

**Request**

```bash
curl -X POST https://gym-tracker.carlossperanza.fyi/api/v1/routine/validate \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "rutina-borrador.xlsx",
    "days": [{ "id": "d0", "name": "Día 1", "exercises": [] }]
  }'
```

**Response `200 OK`, rutina válida**

```json
{ "valid": true }
```

**Response `200 OK`, rutina inválida** — a propósito no es un 400: la
validación funcionó y la respuesta es "no" (un 400 significaría "me negué
a hacerlo", y los clientes MCP marcan cualquier `!ok` como error de la
tool). Ver [`etapa-6-analisis.md`](./etapa-6-analisis.md#nota-de-precisión-por-qué-validate-no-usa-400):

```json
{
  "valid": false,
  "issues": ["days[0]: ..."]
}
```

**Response `400 Bad Request`** — solo si el body ni siquiera es JSON
válido (`INVALID_ROUTINE`, igual que el `PUT`).

### `GET /api/v1/progress/summary`

Resumen del progreso **real** del usuario en un rango: días completados
(marcadores automáticos de `history`), sesiones registradas y top
ejercicios. No genera datos nuevos — es una segunda salida de los que ya
guarda el frontend.

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** query params opcionales `from` / `to` (fechas
`YYYY-MM-DD`). Sin params, default **últimos 30 días**. Si se pasa uno,
hay que pasar los dos.

**Request**

```bash
curl "https://gym-tracker.carlossperanza.fyi/api/v1/progress/summary?from=2026-08-13&to=2026-09-12" \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response `200 OK`**

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

- `completedDays`: fechas distintas en `history` (un día puede tener 2
  filas si se completaron 2 días de rutina esa fecha).
- `sessionsRecorded`: filas de `training_sessions` (varias el mismo día
  cuentan separado).
- `lastSessionAt`: la más reciente del rango, o `null`.
- `topExercises`: top 5 por entradas marcadas hechas.
- `exercisesTracked`: nombres distintos con al menos un peso registrado.
- Sin datos en el rango → `200` con ceros y `topExercises: []`, **no** un
  404. No haber entrenado es un cero legítimo (a propósito distinto de
  `GET .../routine/summary`, donde no tener rutina es `404`).

**Response `400 Bad Request`** — rango inválido (`INVALID_RANGE`):
formato que no es fecha real, solo una de las dos puntas, o `from`
posterior a `to`.

### `GET /api/v1/progress/exercises?name=...`

Serie temporal de peso de **un** ejercicio en el rango, más su benchmark
actual. El nombre es **exacto y case-sensitive** (igual que el
agrupamiento del frontend); sin fuzzy match.

**Autenticación:** requerida (`Authorization: Bearer <api_key>`).

**Parámetros:** query param requerido `name` + query params opcionales
`from` / `to` (mismo default de 30 días que el summary). El nombre va en
la query a propósito, no en el path: los nombres con "/" (`%2F`) no
sobreviven al edge de Netlify como path param (los normaliza a "/" antes
de matchear la ruta y el request nunca llega). Encodearlo igual al armar
la URL (espacios, acentos, barras).

**Request**

```bash
curl "https://gym-tracker.carlossperanza.fyi/api/v1/progress/exercises?name=Press%20banca&from=2026-08-13&to=2026-09-12" \
  -H "Authorization: Bearer gt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Response `200 OK`**

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

- `currentBenchmarkKg`: estado actual (sin filtrar por rango), o `null`.
- `points`: ordenados por `recordedAt` ascendente; una sesión por punto
  aunque haya varias el mismo día. Ejercicios marcados sin peso se
  excluyen (un peso nulo no es 0 kg).

**Response `404 Not Found`** — sin datos para ese nombre en el rango
(`EXERCISE_NOT_FOUND`). El body incluye `availableExercises` (nombres que
sí tienen datos) para reintentar:

```json
{
  "error": {
    "code": "EXERCISE_NOT_FOUND",
    "message": "Sin datos para \"Press plano\" en el rango.",
    "availableExercises": ["Press banca", "Sentadilla"]
  }
}
```

### Regeneración de API Key

No es un endpoint público: es un flujo desde la app (menú lateral →
**Open Tracker** → **Regenerar API Key**, con confirmación). Por detrás
llama a `POST /internal/api-key/regenerate`, un endpoint interno fuera de
`/api/v1` y del spec de OpenAPI — a propósito, para que el Playground no
ofrezca rotar la key con un "Try it" (ver
[`etapa-6-analisis.md`](./etapa-6-analisis.md#nota-de-precisión-por-qué-regen-no-entra-a-openapi)).
Se autentica con la sesión de Supabase del navegador, no con la API Key.

Efectos de regenerar:

- La key anterior deja de funcionar **de inmediato** en todas las
  integraciones que la usen (una sola key activa por usuario, sin período
  de gracia).
- La conexión MCP **remota** se recupera sola (resuelve la key
  just-in-time por usuario).
- El transporte MCP **stdio** (Claude Desktop) se rompe hasta actualizar
  `GYM_TRACKER_API_KEY` en su config a mano.

## Códigos de error

| Status | Code                  | Cuándo ocurre |
|--------|-----------------------|---------------|
| 400    | `INVALID_ROUTINE`      | El body del `PUT` no tiene la forma esperada (ver `issues` para el detalle), o el body del `POST .../validate` ni siquiera es JSON válido. |
| 400    | `INVALID_RANGE`        | `from`/`to` de progreso con formato inválido, rango parcial, o `from` posterior a `to`. |
| 400    | `INVALID_EXERCISE_NAME` | Falta el query param `name`, o el path param del ejercicio está mal encodeado en la URL. |
| 401    | `UNAUTHORIZED`         | Falta el header `Authorization`, o la API Key no es válida. |
| 404    | `ROUTINE_NOT_FOUND`    | `GET` o `GET .../summary` de un usuario que todavía no cargó ninguna rutina. |
| 404    | `EXERCISE_NOT_FOUND`   | Sin datos para ese nombre de ejercicio en el rango (ver `availableExercises` para reintentar). |
| 405    | `METHOD_NOT_ALLOWED`   | Método HTTP no soportado sobre el endpoint (cada endpoint acepta el suyo más `OPTIONS`). |
| 429    | `RATE_LIMITED`         | Se superó el límite de requests por minuto (ver abajo). Header `Retry-After: 60`. |
| 500    | `INTERNAL_ERROR`       | Error inesperado del servidor. |

Todos los errores tienen la misma forma: `{ "error": { "code", "message", ...detalle } }`.

## Rate limiting

60 requests por minuto por usuario (por API Key), en una ventana fija de un
minuto. Al superarlo, la respuesta es `429 RATE_LIMITED` con header
`Retry-After: 60`. Pensado para evitar loops o uso accidental excesivo, no
para tráfico de producción a gran escala.

## Compatibilidad futura

- **Versionado por path** (`/api/v1/...`): un cambio incompatible (quitar un
  campo, cambiar un tipo, cambiar semántica de un status) se publica bajo
  `/api/v2/...`. `/api/v1` sigue funcionando sin cambios mientras existan
  clientes que lo usen.
- **Agregar campos opcionales a las respuestas nunca es un cambio de
  versión** — los clientes deben ignorar campos desconocidos.
- **El DTO público (`Routine`) es estable aunque cambie la persistencia**:
  si mañana la tabla `routines` se reestructura, se parte en varias tablas,
  o se migra a otro motor, el contrato de la API no tiene por qué cambiar
  — ese es precisamente el rol de `toRoutineRow`/`fromRoutineRow`.
- **Nuevos endpoints se agregan, no se insertan** en el medio de los
  existentes — `GET /api/v1/routine/summary` y `POST
  /api/v1/routine/validate` (ver abajo) son ejemplos de esto.

## Notas de arquitectura (para quien construya `gym-tracker-mcp`)

- **Esta API es la única fuente de lógica de negocio.** El futuro servidor
  MCP debe ser un adaptador delgado: traduce herramientas MCP (`getRoutine`,
  `replaceRoutine`, y a futuro `getRoutineSummary`, `validateRoutine`) a
  llamadas HTTP contra esta API. No debe reimplementar validaciones ni
  acceder directamente a la base de datos.
- **Todo lo que necesita el MCP para funcionar es la Base URL + una API
  Key** — no hace falta inspeccionar el código de este repo.
- **Endpoints implementados que el MCP usa (o va a usar):**
  - `GET /api/v1/routine/summary` — resumen de la rutina (conteos,
    bloques, detalle por día). Lo consume `getRoutineSummary`.
  - `POST /api/v1/routine/validate` — valida un payload de rutina sin
    guardarlo (misma `assertValidRoutine` que corre internamente el
    `PUT`). Lo consume `validateRoutine`.
  - `GET /api/v1/progress/summary` y `GET
    /api/v1/progress/exercises?name=...` — progreso real (los consumen las
    tools de progreso del MCP cuando se implementen en su repo).
- **CORS:** habilitado para cualquier origen (`Access-Control-Allow-Origin: *`),
  pensado para integraciones desde cualquier cliente (apps, SDKs, browser).
