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
| Open Tracker como developer hub (Credentials, Developer Resources, Future Integrations) | ✅ | `src/components/OpenTracker.jsx` |
| API Playground interactivo (Scalar, pre-autenticado, lazy-loaded) | ✅ | `src/components/openTracker/Playground.jsx` |
| Quick Start (curl + fetch, con Base URL/API Key reales) | ✅ | `src/components/openTracker/QuickStart.jsx` |

## Funcionalidades pendientes (explícitamente fuera de alcance hasta ahora)

- `GET /api/v1/routine/summary` — no implementado. La arquitectura ya lo
  soporta: sería una Function nueva que llame a una función de resumen en
  `src/domain/routine.js` (esa función de resumen tampoco existe todavía,
  hay que escribirla).
- `POST /api/v1/routine/validate` — no implementado, pero trivial: envolver
  `assertValidRoutine` (ya existe) en una Function nueva. También trivial
  de documentar en el spec de OpenAPI (`_lib/openapiSpec.js`) y de exponer
  en el Playground una vez que exista la Function.
- Regeneración de API Key.
- El servidor MCP (`gym-tracker-mcp`) — repositorio separado, no empezado.
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
   **decisión a revisar el día que se implemente "regenerar"**.
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

## Deuda técnica conocida

- **Sin tests.**
- **Dos caminos de escritura a la tabla `routines`** (frontend vía RLS, API
  vía service role) — aceptado como trade-off (decisión 9), pero es
  duplicación de *código de acceso a datos* (no de lógica de dominio).
- **API Key en texto plano** — aceptable para v1 sin "regenerar", pero
  debería migrar a hash-only cuando se implemente esa funcionalidad
  (decisión 7).
- **Sin regeneración ni expiración de API Keys.**
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

## Próximos pasos recomendados

En orden sugerido (ver [`roadmap.md`](./roadmap.md) para el marco
completo):

1. Evaluar agregar tests mínimos para `src/domain/routine.js` (es la pieza
   más crítica y más fácil de testear por ser funciones puras).
2. Implementar `POST /api/v1/routine/validate` (bajo esfuerzo, reusa
   `assertValidRoutine`).
3. Implementar `GET /api/v1/routine/summary` (requiere escribir la función
   de resumen en el dominio primero).
4. Empezar el repositorio `gym-tracker-mcp` como adaptador delgado sobre
   esta API (no antes de tener al menos `validate` y `summary`, para que el
   MCP tenga algo más que `getRoutine`/`replaceRoutine` para exponer).

**Antes de encarar cualquier cambio grande:** seguí el proceso descrito en
[`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md#cómo-proponer-cambios-grandes)
— analizar, explicar alternativas, recomendar una, recién ahí implementar.
