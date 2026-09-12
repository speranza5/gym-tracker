# Etapa 6 — Endpoints adicionales de la API + regeneración de API Key

> Análisis funcional previo a implementar. Cubre los tres pendientes de
> [Etapa 6](./roadmap.md#etapa-6--endpoints-adicionales-de-la-api-):
> `GET /api/v1/routine/summary`, `POST /api/v1/routine/validate` y
> regeneración de API Key (con la revisión de ADR #7 que el roadmap ya
> anticipa). Es **prerrequisito duro de la Etapa 16**
> ([`etapa-16-analisis.md`](./etapa-16-analisis.md)): `/routine/summary`
> establece el patrón de respuesta que `/progress/summary` tiene que
> espejar, y las tools MCP `get_routine_summary` / `validate_routine`
> dependen de estos endpoints. Ver también: [`api.md`](./api.md) ·
> [`decisions.md`](./decisions.md) · [`roadmap.md`](./roadmap.md) ·
> [`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md)

## Objetivo

Cerrar los tres huecos que `api.md` ya promete como "todavía no
implementados": un resumen liviano de la rutina (para no bajar el DTO
completo cuando solo hace falta "¿qué tengo?"), una validación sin
guardado (para que un asistente verifique antes de reemplazar), y una
salida ante una API Key comprometida (hoy no existe ninguna). Todo en
`/api/v1` (aditivo, sin versionar) salvo regenerar, que va como endpoint
interno — ver tabla.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| ¿Qué devuelve el summary? | `{ fileName, updatedAt, dayCount, exerciseCount, blocks: [{name, exerciseCount}], days: [{id, name, exerciseCount}] }` — conteos + bloques + detalle por día. Ver "Definición de `blocks`" abajo |
| ¿Validate acepta el mismo body que PUT? | Sí, `RoutineInput` idéntico. Válida → `200 {valid: true}`. Inválida → **`200 {valid: false, issues: [...]}`**, no 400 (ver "Por qué validate no usa 400" abajo) |
| ¿Regenerar invalida la key anterior de inmediato o con gracia? | Inmediata: una sola key activa por usuario, la anterior pasa a `401` al instante. Sin columnas/tablas extra ni expiraciones |
| ¿Transporte de regenerar? | **Interno, no `/api/v1`**: `POST /internal/api-key/regenerate`, autenticado con la sesión de Supabase (no con la API Key), + botón "Regenerar" con confirmación en OpenTracker (ver "Por qué regen no entra a OpenAPI" abajo) |
| ¿ADR #7 se cierra con hash-only? | No: texto plano + ADR #7 revisada como decisión consciente. Con regenerar ya hay salida ante compromiso; hash-only queda supeditado al rediseño del MCP, no a esta etapa (ver "Por qué no hash-only todavía" abajo) |
| ¿Se versiona a `/api/v2`? | No. Son endpoints nuevos, aditivos; no cambian la forma de ningún DTO existente (`api.md#compatibilidad-futura`) |
| ¿Dónde vive la lógica de resumen? | `summarizeRoutine` en `src/domain/routine.js` (decisión 10: si dos transportes necesitan la misma regla, va al dominio). La Function solo autentica, lee la fila y llama al dominio |
| Rate limiting | Reusa `checkRateLimit(userId)` sin cambios. Mismo bucket de 60 req/min por usuario, compartido con `/routine` — criterio ya establecido en la Etapa 16 |
| Summary sin rutina cargada | `404 ROUTINE_NOT_FOUND`, igual que el `GET`. Ver "Nota anti-armonización" abajo: es intencional que difiera del `/progress/summary` de la Etapa 16 |

## Nota de precisión: por qué regen no entra a OpenAPI

El Playground es Scalar **pre-autenticado con la API Key real** (ADR
#12): cada "Try it" manda esa key en el header. Si regenerar fuera un
path documentado, un click lo rota y rompe la pre-auth del propio
Playground, sin confirmación posible del lado de Scalar. Evaluadas:

- **Interno como `mcp-identity`/`mcp-api-key` (elegido)** — fuera de
  `/api/v1`, fuera del registro OpenAPI, fuera del Playground. Sin "Try
  it" no hay footgun. Precedente existente (decisión 13).
- En `/api/v1` pero excluido del registro — descartado: path público sin
  documentar en el spec generado rompe el principio "por construcción no
  puede divergir", y el riesgo sigue vivo por `curl`, solo escondido.
- Documentado con el riesgo — descartado: documentar un footgun no lo
  desarma; el click accidental deja al usuario sin entender qué pasó.

Bonus de la opción elegida: rotar es el mecanismo de recuperación ante
una key comprometida, así que pedir prueba de **cuenta** (sesión de
Supabase verificada con `getUser`, mismo patrón que `mcp-identity.js`) en
vez de prueba de **key** (justo lo robado) es la semántica correcta.

Detalle: a diferencia de `mcp-api-key.js` (sin CORS a propósito), este
endpoint lo llama el navegador de la app, así que necesita CORS para el
origen propio (mismo origen en producción, `localhost` en dev).

## Nota de precisión: por qué validate no usa 400

El 400 del PUT significa "me negué a hacerlo"; el de validate
significaría "lo hice y la respuesta es inválida". Del lado MCP,
`client.ts` lanza en cualquier `!response.ok` y la tool marca
`isError: true` — el LLM leería "falló" cuando la validación funcionó
perfectamente. Por eso la regla es:

- Body inparseable (no-JSON) → `400 INVALID_ROUTINE` ("me negué a
  hacerlo", igual que el PUT).
- Body parseable pero rutina inválida → `200 { valid: false, issues:
  [...] }` ("lo hice y la respuesta es no").
- Rutina válida → `200 { valid: true }`.

`validate` nunca usa el código `INVALID_ROUTINE` para contenido, solo
para body malformado. No se deja en 400 por simetría con el PUT: la
simetría acá miente sobre el significado del status.

## Nota de precisión: `POST` falta en el CORS de `_lib/http.js`

`CORS_HEADERS` declara `'Access-Control-Allow-Methods': 'GET, PUT,
OPTIONS'` — **sin `POST`**. `POST /api/v1/routine/validate` lo necesita:
hay que agregar `POST` ahí. Se aclara para que conste como cambio
previsto del spec, no como "arreglo" oportunista (espejo invertido de la
nota de la Etapa 16, donde `GET` ya estaba incluido).

## Definición de `blocks`

- **Forma**: array de `{ name: string | null, exerciseCount: number }`,
  ordenados por **primera aparición** en la rutina (estable y
  significativo, no alfabético ni por conteo).
- **Ejercicios sin block** (el campo es opcional en `ExerciseSchema`):
  van en un bucket `{ name: null, exerciseCount: n }` — no se excluyen ni
  se etiquetan como `"Sin bloque"`. Motivo: preserva el invariante
  `sum(blocks[].exerciseCount) === exerciseCount`, que un consumidor
  máquina va a asumir. `null` es honesto y no inventa etiquetas en el
  contrato. Si se excluyeran, el mismatch sería una trampa permanente que
  habría que documentar para siempre — peor.

## Nota anti-armonización: 404 acá, 200 con ceros en la Etapa 16

Summary sin rutina → `404 ROUTINE_NOT_FOUND`, pero el
`/progress/summary` de la Etapa 16 devuelve `200` con contadores en cero.
**Es intencional y distinto, no unificar después**: no tener rutina es la
ausencia del recurso; no haber entrenado todavía es un cero legítimo.

## Nota de precisión: por qué no hash-only todavía

Regenerar elimina el bloqueo original de ADR #7 (sin regenerar,
hash-only dejaba al usuario sin forma de recuperar su key). Pero
hash-only ahora rompería `mcp-api-key.js`, que devuelve la key real al
servidor MCP server-to-server — con solo el hash guardado eso es
imposible, y rediseñar la auth del MCP es otro repo, fuera de este spec.
`authenticate()` sigue comparando texto plano. La ADR #7 se revisa en
esta etapa como decisión consciente (hay salida ante compromiso), no
queda pendiente por olvido.

## Fuera de alcance (pospuesto)

- **Expiración de API Keys** (las keys no expiran; regenerar es manual).
- **Múltiples keys activas por usuario** (una sola, ver tabla).
- **Hash-only** — supeditado al rediseño del MCP, documentado arriba.
- **Tools MCP `getRoutineSummary` / `validateRoutine`** — otro repo
  (`gym-tracker-mcp`), después del deploy de esto.
- **Período de gracia en regenerar** — ver tabla.
- **Analytics de uso de los endpoints nuevos** — sin stack de analytics
  (mismo criterio que la Etapa 15).

## `summarizeRoutine` en `src/domain/routine.js` (existe la mitad)

`assertValidRoutine` ya existe — `validate` solo lo envuelve. Lo que no
existe es la función de resumen; se escribe pura (recibe el DTO ya
leído, no sabe de Supabase), mismo estilo del archivo (JS plano + JSDoc
+ Zod):

```js
/**
 * Resume una rutina a conteos + bloques + detalle por día. Pura: recibe
 * el DTO ya leído, no sabe de dónde vino (API vía service role o, a
 * futuro, otro transporte).
 */
export function summarizeRoutine(routine) { /* ... */ }
```

**Schema de Zod para el DTO de respuesta** (`RoutineSummarySchema`), en
el mismo archivo y con `.openapi()` en los campos, para que
`openapiSpec.js` lo registre igual que hace con `RoutineInputSchema`.
`blocks[].name` es `z.string().nullable()` (ver "Definición de `blocks`").

### DTO de `/routine/summary`

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

### DTO de `/routine/validate`

```json
{ "valid": true }
```

```json
{ "valid": false, "issues": ["days[2].exercises[0]: Required"] }
```

## `netlify/functions/routine-summary.js` (nuevo)

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
    // select file_name, days, updated_at filtrado por user_id (igual que handleGet)
    // sin fila -> 404 ROUTINE_NOT_FOUND (igual que handleGet)
    // summarizeRoutine(fromRoutineRow(data)) -> jsonResponse(200, ...)
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/routine/summary' }
```

- Sin rutina → **`404 ROUTINE_NOT_FOUND`**, no un summary en ceros (ver
  nota anti-armonización).
- Error de Supabase → `500 INTERNAL_ERROR`, igual que `routine.js`.

## `netlify/functions/routine-validate.js` (nuevo)

```js
export default async (request) => {
  // ... mismo preámbulo (OPTIONS, authenticate, checkRateLimit, 405,
  // salvo que solo acepta POST)
  // body inparseable -> 400 INVALID_ROUTINE 'El body debe ser JSON válido.'
  // try assertValidRoutine(body) -> 200 { valid: true }
  // catch RoutineValidationError -> 200 { valid: false, issues: e.issues }
}

export const config = { path: '/api/v1/routine/validate' }
```

- No lee ni escribe Supabase: solo autentica (también para rate limiting
  por usuario y para no exponer cómputo a anónimos), valida y responde.
- El `issues` es el mismo array que el PUT expone en el 400 — mismo
  formato, distinto status (ver nota de precisión).

## `netlify/functions/api-key-regenerate.js` (nuevo, interno)

Fuera del contrato `/api/v1` (no aparece en `api.md` como endpoint
público ni en el spec de OpenAPI — ver nota de precisión). Patrón de
`mcp-identity.js`: sesión de Supabase, no API Key:

```js
export default async (request) => {
  // solo POST (405 en otro caso), con CORS para el origen de la app
  // Authorization: Bearer <supabase_access_token> -> getUser(token)
  // sin sesión válida -> 401 UNAUTHORIZED
  // genera key nueva (mismo formato gt_live_ + 20 bytes), update en api_keys por user_id
  // devuelve 200 { apiKey: <nueva> }
}

export const config = { path: '/internal/api-key/regenerate' }
```

- La key anterior queda inválida en el mismo `update` (una sola fila por
  usuario, un solo `update` atómico — no hay ventana donde convivan).
- La respuesta muestra la key nueva para copiarla; con texto plano sigue
  visible en OpenTracker después, sin flujo de "mostrar una sola vez".
- Error de Supabase → `500 INTERNAL_ERROR`.

## Pantalla OpenTracker (botón "Regenerar")

En la sección de credenciales, junto a la key actual: botón "Regenerar"
que abre confirmación antes de llamar al endpoint interno. El copy de
confirmación **tiene que** advertir las dos consecuencias cruzadas
(ítem de checklist, no prosa aspiracional):

- La key anterior deja de funcionar de inmediato en todas las
  integraciones que la usen.
- La conexión MCP **remota** se recupera sola (resuelve la key
  just-in-time por usuario); el transporte **stdio** de Claude Desktop
  se rompe hasta actualizar `GYM_TRACKER_API_KEY` en su config a mano.

Tras regenerar, la pantalla muestra la key nueva (los ejemplos de Quick
Start la leen en vivo, así que se actualizan solos).

## `docs/api.md`

- Documentar `GET /api/v1/routine/summary` y `POST
  /api/v1/routine/validate` con la misma estructura que `/routine`:
  propósito, auth, request/response de ejemplo, `curl`, errores.
- `api.md` documenta regenerar como **flujo** (dónde está el botón, qué
  pasa con la key anterior, advertencia MCP remota vs. stdio), no como
  endpoint público — el endpoint interno no va a la referencia de
  endpoints.
- Agregar a la tabla de códigos lo que aplique (el `200 {valid: false}`
  no es un error y no va a esa tabla; se explica en la sección de
  validate).
- Actualizar el párrafo "No expira todavía; tampoco hay endpoint de
  regeneración en esta versión": la regeneración ya existe (vía la app),
  la expiración sigue sin existir.

## Cambios en archivos existentes

| Archivo | Cambio |
|---|---|
| `src/domain/routine.js` | Agregar `summarizeRoutine` + `RoutineSummarySchema` (con `.openapi()`) |
| `netlify/functions/_lib/openapiSpec.js` | Registrar los dos paths públicos + schemas nuevos, con **`await import()` dinámico** (misma regla que la nota de la Etapa 16). El endpoint interno **no** se registra |
| `netlify/functions/_lib/http.js` | Agregar `POST` a `Access-Control-Allow-Methods` (ver nota de precisión). Sin este cambio, `validate` falla por CORS desde browsers |
| `netlify/functions/_lib/auth.js` | **Sin cambios** — comparación en texto plano (ver nota hash-only) |
| `netlify/functions/_lib/apiKeys.js` y `src/utils/apiKeys.js` | **Sin cambios** — `getOrCreate` sigue vigente para primer uso y para `mcp-identity` |
| `src/components/OpenTracker.jsx` | Botón "Regenerar" con confirmación (copy con ambas advertencias MCP) |
| `docs/api.md` | Dos endpoints + flujo de regeneración + ajustes (ver arriba) |

No se cambia ninguna consulta de `cloudSync.js`: el frontend sigue leyendo
directo de Supabase (decisión 9 — esta etapa no lo cambia).

## Contrato para el consumidor (incluido `gym-tracker-mcp`)

Los DTOs de summary y validate son **contrato público**:
`gym-tracker-mcp` los va a espejar en `get_routine_summary` /
`validate_routine`, y el día de mañana un SDK o la app mobile también.
Consecuencias concretas:

- **Documentarlos en `api.md` es parte de esta etapa, no un extra.**
- **No cambiar su forma después del deploy sin versionar** (`/api/v2/...`),
  igual que ya aplica para `Routine`. Antes del primer deploy son libres;
  después, no.
- El `200 {valid: false, issues}` existe para el consumidor, no para el
  frontend: le permite a un LLM corregir el payload y reintentar en vez de
  rendirse. Si se recorta `issues`, la tool del otro repo pierde su mejor
  propiedad.

La mitad MCP arranca **después** de que esto esté desplegado en
producción.

## Checklist de implementación

- [ ] `src/domain/routine.js` — `summarizeRoutine` + `RoutineSummarySchema`
      (`.openapi()`, `blocks[].name` nullable).
- [ ] `netlify/functions/routine-summary.js` (404 sin rutina, igual que el
      GET).
- [ ] `netlify/functions/routine-validate.js` (solo POST; 400 solo para
      body inparseable; `200 {valid}` en ambos casos de contenido).
- [ ] `netlify/functions/api-key-regenerate.js` (path `/internal/...`,
      auth por sesión Supabase, CORS del origen propio, update atómico,
      devuelve `{apiKey}`).
- [ ] `_lib/http.js` — `POST` en `Access-Control-Allow-Methods`.
- [ ] `_lib/openapiSpec.js` — dos paths + schemas, import dinámico. El
      interno no se registra.
- [ ] OpenTracker — botón "Regenerar" con confirmación cuyo copy advierte
      key anterior inválida + MCP remota (sola) vs. stdio (manual).
- [ ] `docs/api.md` — dos endpoints, flujo de regeneración, tabla de
      errores y párrafo de expiración actualizados.
- [ ] `npm run lint && npm run build`.
- [ ] Probar con `netlify dev` + `curl`: summary con rutina, summary sin
      rutina (404), validate válida (`{valid:true}`), validate inválida
      (`{valid:false}` + `issues`), body no-JSON (400), sin API Key (401),
      método erróneo (405), regen con sesión (key nueva + vieja da 401 +
      nueva funciona en `GET /routine`).
- [ ] Confirmar que los dos endpoints aparecen en el Playground y se
      pueden ejecutar desde ahí; confirmar que regen **no** aparece.
- [ ] `docs/handoff.md` — endpoints nuevos, `summarizeRoutine`, regen,
      revisión de ADR #7.
- [ ] `docs/decisions.md` — ADR nueva: regen como endpoint interno con
      sesión (revisa el "POST público" que se evaluó primero), validate
      200-vs-400, `blocks` con bucket nulo, y revisión explícita de ADR #7
      (texto plano consciente, hash-only supeditado al MCP).
- [ ] `docs/roadmap.md` — marcar la Etapa 6 como ✅.
- [ ] Desplegar a producción. **Recién ahí** arrancan las tools MCP y se
      desbloquea la Etapa 16.
