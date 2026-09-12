# Handoff para modelos de IA

> Este documento está pensado para que **otro modelo de IA** (Claude, GPT,
> Gemini, Qwen, DeepSeek, Kimi, etc.) pueda leer *solo esto* y empezar a
> trabajar sin tener que reconstruir contexto leyendo todo el código.
> Para profundizar: [`architecture.md`](./architecture.md) ·
> [`decisions.md`](./decisions.md) · [`api.md`](./api.md) ·
> [`roadmap.md`](./roadmap.md) · [`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md)
> (reglas de estilo de trabajo, leer antes de hacer cambios grandes).

## Objetivo del proyecto

Gym Tracker es una app para seguir una rutina de gimnasio importada desde
Excel, con checklist diaria y sync opcional en la nube. Está evolucionando
hacia **Open Tracker**: una plataforma donde la rutina de un usuario es
accesible vía una API REST pública, pensada para que agentes de IA, un
futuro servidor MCP, SDKs y apps puedan leerla/escribirla — no solo el
frontend.

## Estado actual (al momento de escribir este documento)

- **Deployado en producción:** `https://gym-tracker.carlossperanza.fyi`
  (Netlify, sitio `gym-tracker-425`), incluyendo la API de Open Tracker.
- **Git:** todo commiteado y pusheado a `origin/main` (código de Open
  Tracker + esta documentación). El sitio de Netlify está **conectado a
  GitHub para CI/CD** — cada push a `main` dispara build y deploy
  automático; ya no hace falta correr `netlify deploy --prod` a mano (ver
  [`README.md`](../README.md#cómo-desplegarlo)). Si estás retomando este
  proyecto, igual arrancá con `git status` para confirmar que sigue así —
  esta sección puede quedar desactualizada.
- **Sin tests automatizados** (ni unitarios ni de integración). Toda la
  verificación hecha hasta ahora fue manual: `npm run lint`, `npm run
  build`, y pruebas con `curl` contra `netlify dev` (local) y contra
  producción.
- **`gym-tracker-mcp` (repo separado) ya existe y está deployado**, tanto
  local (stdio) como remoto (`https://gym-tracker-mcp.netlify.app/mcp`,
  OAuth 2.1 + DCR con login real de Google). Este repo (`gym-tracker`)
  expone dos endpoints internos que ese servidor necesita —
  `mcp-identity.js`, `mcp-api-key.js` — ver `decisions.md` #13.

## Funcionalidades implementadas

| Funcionalidad | Estado | Dónde vive |
|---|---|---|
| Importar rutina desde Excel | ✅ | `src/utils/excelParser.js`, `src/hooks/useWorkoutData.js` |
| Checklist diaria + reseteo automático por día | ✅ | `src/hooks/useProgress.js` |
| Historial de racha (días al 100%) | ✅ | `src/hooks/useProgress.js` (tabla `history`) |
| Vista Lista y vista Foco | ✅ | `src/components/ExerciseList.jsx`, `FocusView.jsx` |
| Login opcional con Google (Supabase Auth) | ✅ | `src/hooks/useAuth.js`, `src/components/AuthButton.jsx` |
| Sync de rutina/progreso/historial en la nube | ✅ | `src/utils/cloudSync.js` |
| Menú lateral (drawer) | ✅ | `src/components/SideMenu.jsx` |
| **Open Tracker — `GET /api/v1/routine`** | ✅ | `netlify/functions/routine.js` |
| **Open Tracker — `PUT /api/v1/routine`** | ✅ | `netlify/functions/routine.js` |
| API Keys por usuario (una, no expira) | ✅ | `src/utils/apiKeys.js`, tabla `api_keys` |
| Pantalla "Open Tracker" en el menú (solo logueado) | ✅ | `src/components/OpenTracker.jsx` |
| Rate limiting (60 req/min) | ✅ | `netlify/functions/_lib/rateLimit.js` |
| Dominio compartido Excel ↔ API (Zod) | ✅ | `src/domain/routine.js` |
| Spec OpenAPI público (`GET /api/v1/openapi.json`), generado desde Zod | ✅ | `netlify/functions/_lib/openapiSpec.js`, `netlify/functions/openapi.js` |
| Open Tracker como developer hub (Credentials, Developer Resources) | ✅ | `src/components/OpenTracker.jsx` |
| API Playground interactivo (Scalar, pre-autenticado, lazy-loaded) | ✅ | `src/components/openTracker/Playground.jsx` |
| Quick Start (curl + fetch, con Base URL/API Key reales) | ✅ | `src/components/openTracker/QuickStart.jsx` |
| Endpoints internos para `gym-tracker-mcp` (identidad + resolución de API Key) | ✅ | `netlify/functions/mcp-identity.js`, `mcp-api-key.js`, `_lib/apiKeys.js` |
| Guía "Conectar MCP" en Open Tracker (pasos para Claude y ChatGPT) | ✅ | `src/components/openTracker/ConnectMcp.jsx` |
| Welcome tour de primer login (spotlight sobre el empty state, una sola vez, tabla `profiles`) | ✅ | `src/components/WelcomeTour.jsx` (`react-joyride`), `src/utils/profile.js`, `src/components/FileUpload.jsx` |
| **Open Tracker — `GET /api/v1/routine/summary`** | ✅ | `netlify/functions/routine-summary.js`, `summarizeRoutine` en `src/domain/routine.js` |
| **Open Tracker — `POST /api/v1/routine/validate`** | ✅ | `netlify/functions/routine-validate.js` (`200 {valid}` en vez de 400, ver `decisions.md` #18) |
| Regeneración de API Key (endpoint interno + botón en Open Tracker) | ✅ | `netlify/functions/api-key-regenerate.js`, `src/utils/apiKeyRegen.js` |
| **Open Tracker — `GET /api/v1/progress/summary`** (mitad repo; tools MCP pendientes en el otro repo) | ✅ | `netlify/functions/progress-summary.js`, `summarizeProgress` en `src/domain/progress.js` |
| **Open Tracker — `GET /api/v1/progress/exercises/{nombre}`** (mitad repo; tools MCP pendientes en el otro repo) | ✅ | `netlify/functions/progress-exercise.js`, `buildExerciseSeries` en `src/domain/progress.js` |
| Lógica de stats en el dominio (`src/utils/statsAggregation.js` movido a `src/domain/progress.js`) | ✅ | `src/domain/progress.js`, `src/components/StatsView.jsx` |
| Sistema de motion (tokens en `index.css`, guard de reduced-motion, toast/check/pulso-100%/entrada de pantallas) | ✅ | `src/index.css`, `src/App.css`, `Toast.jsx`, `ProgressBar.jsx` (ver `decisions.md` #20) |

## Funcionalidades pendientes (explícitamente fuera de alcance hasta ahora)

- Migrar el frontend para que consuma su propia API en vez de hablar
  directo con Supabase (ver decisión 9 en `decisions.md`).
- Tests automatizados (no hay ninguno todavía).

Detalle de visión y orden esperado en [`roadmap.md`](./roadmap.md).

## Decisiones importantes (leer antes de cambiar algo)

Resumen — el detalle completo con alternativas y motivos está en
[`decisions.md`](./decisions.md):

1. Login opcional, nunca gate de acceso.
2. `localStorage` es la fuente de verdad inmediata; Supabase es destino de
   sync, nunca bloqueante.
3. Al loguearse en un dispositivo nuevo, la nube gana sobre el local.
4. Sin router — una sola pieza de estado (`screen`) conmuta pantallas.
5. La API corre en Netlify Functions, no en un servidor separado.
6. La API usa la *service role key* de Supabase + autorización manual, no
   RLS ni JWTs por request.
7. La API Key se guarda en texto plano (protegida por RLS), no hasheada —
   revisada en la Etapa 6 y mantenida a conciencia: con regenerar ya hay
   salida ante compromiso, y hash-only queda supeditado al rediseño del
   MCP (ver `decisions.md` #18).
8. Rate limiting respaldado en una tabla de Postgres, no en memoria.
9. El frontend **no** consume todavía su propia API — sigue yendo directo
   a Supabase. Es intencional, no un olvido.
10. `src/domain/routine.js` es la única fuente de verdad de "qué es una
    rutina válida" — la usan el importador de Excel y la API por igual.
11. El spec de OpenAPI se genera desde esos mismos schemas de Zod
    (`@asteasolutions/zod-to-openapi`), no se escribe a mano.
12. El Playground interactivo usa Scalar, no Swagger UI — mucho más
    liviano y con pre-auth de Bearer token más directa; se carga con
    `React.lazy` para no pesar en el bundle principal.
13. Dos endpoints internos (`mcp-identity.js`, `mcp-api-key.js`), fuera del
    contrato público `/api/v1`, para que `gym-tracker-mcp` resuelva
    identidad real de usuario y su API Key sin acceder a Supabase
    directamente — el segundo gateado por `MCP_SERVICE_SECRET`.

## Convenciones del proyecto

- **Sin TypeScript** — JS plano con JSDoc donde el tipo no es obvio (ver
  `src/domain/routine.js` como referencia de estilo).
- **Sin comentarios que expliquen el "qué"** — el código se nombra para
  explicarse solo. Los comentarios que existen explican el "por qué" (una
  decisión no obvia, un caso borde).
- **CSS plano**, sin framework, con variables en `src/index.css`
  (`--bg`, `--accent`, `--border`, `--radius`, etc.) — cualquier componente
  nuevo reusa esas variables, no inventa colores nuevos.
- **Componentes de UI no acceden a Supabase** — eso vive en hooks
  (`src/hooks/`) o utils de transporte (`src/utils/`).
- **Nombres de archivo:** componentes en `PascalCase.jsx`, hooks
  `useAlgo.js`, utils/dominio en `camelCase.js`.
- **Idioma:** todo el código, comentarios y documentación del proyecto está
  en español (la UI de la app también). Mantené esa convención.
- **Commits:** mensajes en inglés, imperativos ("Add X", "Fix Y") — ver
  `git log` para el estilo exacto usado hasta ahora.

## Qué NO debería modificarse (sin pensarlo dos veces)

- **No** mover lógica de validación/mapeo de rutina fuera de
  `src/domain/routine.js` hacia un transporte (hook, Function, futuro MCP).
- **No** poner la `SUPABASE_SERVICE_ROLE_KEY` detrás de un prefijo `VITE_`
  (la expondría en el bundle del navegador) ni usarla desde código que
  corre en el cliente.
- **No** eliminar el fallback offline-first (`localStorage` como fuente de
  verdad inmediata) — es un requisito de producto, no un detalle técnico.
- **No** cambiar la forma del DTO público `Routine` (`fileName`, `days`,
  `updatedAt`) sin versionar (`/api/v2/...`) — hay contratos externos que
  dependen de esto (o los habrá, con el MCP).
- **No** asumir que el frontend es el único cliente de la API al diseñar
  nuevos endpoints — pensarlos para consumidores externos primero.
- **No** hacer que `mcp-identity.js` devuelva la API Key real (solo
  `{userId, email}`) — ese endpoint lo llama un navegador; la API Key
  vive únicamente detrás de `mcp-api-key.js`, gateado por
  `MCP_SERVICE_SECRET`, server-to-server (ver `decisions.md` #13).
- **No** aflojar el CORS de `mcp-api-key.js` (hoy sin CORS en absoluto) —
  ese endpoint no debería ser alcanzable nunca desde un navegador.

## Deuda técnica conocida

- **Sin tests.**
- **Dos caminos de escritura a la tabla `routines`** (frontend vía RLS, API
  vía service role) — aceptado como trade-off (decisión 9), pero es
  duplicación de *código de acceso a datos* (no de lógica de dominio).
- **API Key en texto plano** — revisada en la Etapa 6 y mantenida a
  conciencia (con regenerar ya hay salida ante compromiso; hash-only queda
  supeditado al rediseño del MCP, ver `decisions.md` #18).
- **Sin expiración de API Keys** (regeneración manual sí existe desde la
  Etapa 6).
- **Rate limiting simple** (ventana fija, no sliding window) — puede
  permitir ráfagas de hasta 2x el límite justo en el borde de una ventana.
- **`src/domain/routine.js` se reescribió con Zod sin tests automatizados
  como red de seguridad** — se verificó manualmente con casos puntuales
  (ver `decisions.md` #11), pero un cambio futuro a esos schemas debería
  ir acompañado de, como mínimo, agregar los tests que todavía no existen.
- **`@scalar/api-reference-react` trae dependencias de Vue** (es un
  detalle interno de cómo está implementado Scalar, no una decisión de
  este proyecto) — inflan `node_modules` pero no el bundle del navegador
  gracias al lazy-load; si esto llegara a ser un problema real, reevaluar
  contra Swagger UI (ver `decisions.md` #12).
- **`react-joyride` agrega ~720 KB sin comprimir** (librería + transitivas,
  ver `decisions.md` #17) — va en el bundle principal porque el tour corre
  en la primera pantalla post-login; no se lazy-loadeó por ser un recorrido
  de 3 pasos que debe estar listo al montar el empty state.

## Próximos pasos recomendados

En orden sugerido (ver [`roadmap.md`](./roadmap.md) para el marco
completo):

1. Evaluar agregar tests mínimos para `src/domain/routine.js` (es la pieza
   más crítica y más fácil de testear por ser funciones puras).
2. Implementar `validate`/`summary` en `gym-tracker-mcp` (los endpoints ya
   existen acá desde la Etapa 6).
3. Confirmar en el dashboard de Supabase que
   `https://gym-tracker-mcp.netlify.app/oauth/authorize` está en la lista
   de Redirect URLs permitidas (Auth → URL Configuration) — sin eso, el
   login con Google del conector remoto no completa el flujo.

**Antes de encarar cualquier cambio grande:** seguí el proceso descrito en
[`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md#cómo-proponer-cambios-grandes)
— analizar, explicar alternativas, recomendar una, recién ahí implementar.
