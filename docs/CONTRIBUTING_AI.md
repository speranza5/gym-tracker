# Guía para asistentes de IA

> Esta es una guía **permanente** para cualquier modelo de IA (Claude, GPT,
> Gemini, Qwen, DeepSeek, Kimi, u otro) que trabaje sobre este repositorio,
> ahora o en el futuro. Si estás por hacer un cambio, leé esto primero.
> Para contexto puntual del estado actual, ver [`handoff.md`](./handoff.md).

## Filosofía

- **Priorizar simplicidad.** Este proyecto eligió deliberadamente no usar
  router, no usar TypeScript, no usar un framework de CSS, no usar un
  servidor propio (Netlify Functions en vez de Express) — cada una de esas
  fue una decisión activa por simplicidad, no una omisión. No las
  reviertas sin una razón concreta y documentada.
- **Evitar sobreingeniería.** No construyas abstracciones para casos que
  no existen todavía. Los endpoints `summary`/`validate` de Open Tracker,
  por ejemplo, están *documentados* como intención pero deliberadamente
  **no implementados** hasta que haya un consumidor real que los necesite.
- **Favorecer composición sobre duplicación.** Si dos transportes (Excel,
  API, futuro MCP) necesitan la misma regla, esa regla va en
  `src/domain/`, y ambos la llaman — no se reescribe.
- **Mantener una arquitectura limpia.** Las capas descritas en
  [`architecture.md`](./architecture.md) (UI, hooks, dominio, utils,
  Functions) no se mezclan. Un componente no llama a Supabase; una
  Function no valida "a mano" lo que ya valida el dominio.
- **Mantener la API como contrato público estable.** `/api/v1/routine` no
  es un detalle interno — puede haber (o va a haber) clientes reales
  dependiendo de él. Ver "Qué NO hacer" abajo.

## Principios

- **La lógica de negocio pertenece al dominio** (`src/domain/`). Si estás
  escribiendo un `if` que decide "qué es válido" o "cómo se transforma un
  dato", preguntate primero si ese código debería vivir ahí en vez de en
  el hook/componente/Function donde lo estás por escribir.
- **El transporte nunca debe contener lógica.** Excel (`utils/excelParser.js`),
  REST (`netlify/functions/`), y el futuro MCP son formas de *entrar o
  salir* del sistema — no de decidir nada por su cuenta.
- **Todo cambio debe ser extensible.** Antes de cerrar una decisión,
  preguntate: ¿esto le complica la vida a la próxima integración (MCP,
  SDK, mobile)? Si la respuesta es sí, buscá otra forma.
- **Evitar romper compatibilidad.** Un cambio a un endpoint existente que
  pueda romper a un cliente externo va en una versión nueva
  (`/api/v2/...`), no se hace in-place. Ver
  [`api.md`](./api.md#compatibilidad-futura).
- **Preferir refactorizar antes que duplicar.** Si ves la misma lógica en
  dos lugares (por ejemplo, al agregar un tercer transporte), es momento
  de subirla a `src/domain/`, no de copiarla una tercera vez.

## Convenciones

**Organización de carpetas:**
- `src/components/` — UI pura (React), sin acceso a Supabase ni reglas de
  negocio.
- `src/hooks/` — estado de React y orquestación (cuándo leer/guardar).
- `src/domain/` — funciones puras de negocio, sin dependencias externas.
- `src/utils/` — adaptadores de transporte/infraestructura (Excel,
  Supabase desde el navegador, `localStorage`, API Keys).
- `src/lib/` — clientes de terceros configurados (hoy: `supabaseClient.js`).
- `netlify/functions/` — transporte HTTP; `_lib/` para helpers compartidos
  entre Functions (auth, rate limit, respuestas HTTP).
- `docs/` — esta documentación.

**Nombrar componentes:** `PascalCase.jsx`, un componente por archivo,
nombre del archivo = nombre del componente exportado.

**Nombrar hooks:** `useAlgo.js`, siempre empiezan con `use`, devuelven un
objeto con las props/acciones que necesita quien lo consume (no arrays
posicionales, salvo que sea un solo valor + setter tipo `useState`).

**Nombrar servicios/dominio:** verbos claros en `camelCase`
(`normalizeRoutine`, `assertValidRoutine`, `pushRoutine`,
`getOrCreateApiKey`) — el nombre debe decir qué hace sin tener que leer el
cuerpo.

**Diseñar un endpoint nuevo:**
1. La lógica va primero en `src/domain/` (validar, transformar) si no
   existe ya.
2. La Function en `netlify/functions/` solo parsea el request, autentica
   (`_lib/auth.js`), aplica rate limit (`_lib/rateLimit.js`), llama al
   dominio, y devuelve una respuesta con `_lib/http.js`
   (`jsonResponse`/`errorResponse`) — nunca implementa reglas propias.
3. El path va versionado (`/api/v1/...`) vía `export const config = { path: ... }`.
4. Se documenta en `docs/api.md` con los mismos campos que los endpoints
   existentes (propósito, autenticación, parámetros, request/response de
   ejemplo, curl, errores).
5. Si el endpoint es candidato a ser una herramienta MCP futura, decílo
   explícitamente en la documentación (como ya se hace con `summary` y
   `validate`).

**Agregar una funcionalidad nueva al frontend:** seguí el patrón existente
— un hook maneja estado + efectos de sync, un componente renderiza, CSS
nuevo reusa las variables de `src/index.css` (no inventes colores nuevos).

## Qué NO hacer

- **No duplicar lógica.** Si necesitás la misma validación/transformación
  en dos lugares, es una señal de que tiene que vivir en `src/domain/`.
- **No acceder a Supabase directamente desde múltiples capas sin
  criterio.** Hoy hay exactamente dos puntos de acceso legítimos: el
  cliente del navegador (`src/lib/supabaseClient.js`, anon key + RLS) y el
  cliente admin server-side (`netlify/functions/_lib/supabaseAdmin.js`,
  service role key). No agregues un tercero sin una razón documentada.
- **No acoplar el frontend con la persistencia de forma que sea difícil de
  desenganchar después.** El frontend habla con Supabase hoy por decisión
  explícita (ver `decisions.md` #9), no porque el dominio dependa de
  Supabase — el dominio (`src/domain/routine.js`) no importa
  `@supabase/supabase-js` ni nada de infraestructura.
- **No romper la API pública.** Cambiar la forma de una respuesta, un
  código de error, o el significado de un campo existente en `/api/v1/`
  sin versionar es romper un contrato — aunque hoy el único cliente
  conocido sea de prueba.
- **No mezclar dominio con infraestructura.** `src/domain/routine.js` no
  debería importar nunca `@supabase/supabase-js`, `fetch`, ni nada que
  dependa de un runtime específico (navegador vs. Netlify Functions).
- **No exponer la `SUPABASE_SERVICE_ROLE_KEY` al cliente.** Nunca con
  prefijo `VITE_`, nunca importada desde `src/` (solo desde
  `netlify/functions/`).
- **No asumas que el código de Open Tracker está commiteado.** Revisá
  `git status` antes de asumir el estado del repo — ver
  [`handoff.md`](./handoff.md).

## Cómo proponer cambios grandes

Antes de implementar algo que toque arquitectura (nueva capa, nuevo
transporte, cambio de modelo de autenticación, nueva tabla, etc.):

1. **Analizar la arquitectura existente** — leé `architecture.md` y
   `decisions.md` para no proponer algo que ya se consideró y descartó (o
   que ya existe de otra forma).
2. **Explicar alternativas** — presentá al menos dos enfoques posibles con
   sus trade-offs reales (no una alternativa de paja fácil de descartar).
3. **Recomendar una** — con motivos concretos, no genéricos ("es más
   simple" necesita explicar *por qué* es más simple acá).
4. **Implementar únicamente después de definir el enfoque** — con quien te
   esté dando la tarea, si hay ambigüedad real sobre qué decisión tomar.

Esto es literalmente el mismo proceso que se siguió para diseñar Open
Tracker (ver `decisions.md` #5 a #9) — no es una formalidad, es cómo se
construyó este proyecto hasta ahora.

## Visión

Gym Tracker está evolucionando hacia una plataforma abierta llamada **Open
Tracker**, donde la API (`/api/v1/...`) es consumida por igual por:

- el frontend React actual,
- un futuro servidor MCP (`gym-tracker-mcp`),
- SDKs oficiales,
- aplicaciones móviles,
- e integraciones externas que todavía no existen.

**El frontend debe tratarse como un cliente más de la plataforma, no como
un ciudadano especial.** Hoy el frontend todavía habla directo con
Supabase por una decisión pragmática de esta iteración (`decisions.md`
#9) — pero ningún diseño futuro debería asumir que el frontend tiene (o
necesita tener) acceso privilegiado que un cliente externo no tenga. Si
estás diseñando algo nuevo y la pregunta es "¿esto lo hago solo para el
frontend o lo expongo en la API?", la respuesta casi siempre debería ser
la API — ver [`roadmap.md`](./roadmap.md) para hacia dónde va esto.
