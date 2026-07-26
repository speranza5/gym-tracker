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
lateral → **Open Tracker**, una vez logueado). No expira todavía; tampoco
hay endpoint de regeneración en esta versión.

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

## Códigos de error

| Status | Code                  | Cuándo ocurre |
|--------|-----------------------|---------------|
| 400    | `INVALID_ROUTINE`      | El body del `PUT` no tiene la forma esperada (ver `issues` para el detalle). |
| 401    | `UNAUTHORIZED`         | Falta el header `Authorization`, o la API Key no es válida. |
| 404    | `ROUTINE_NOT_FOUND`    | `GET` de un usuario que todavía no cargó ninguna rutina. |
| 405    | `METHOD_NOT_ALLOWED`   | Método HTTP distinto de `GET`/`PUT`/`OPTIONS` sobre este endpoint. |
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
- **Endpoints todavía no implementados, pero con la arquitectura lista:**
  - `GET /api/v1/routine/summary` — resumen de la rutina (cantidad de días,
    ejercicios, etc.).
  - `POST /api/v1/routine/validate` — valida un payload de rutina sin
    guardarlo (usa la misma función de dominio `assertValidRoutine` que ya
    corre internamente en el `PUT`).

  Agregarlos es sumar un archivo nuevo en `netlify/functions/` que llame a
  la función de dominio correspondiente en `src/domain/routine.js` — la
  misma capa de dominio que ya usan el importador de Excel y `PUT
  /api/v1/routine` hoy.
- **CORS:** habilitado para cualquier origen (`Access-Control-Allow-Origin: *`),
  pensado para integraciones desde cualquier cliente (apps, SDKs, browser).
