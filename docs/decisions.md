# Decisiones de arquitectura (ADR simplificado)

> Ver también: [`architecture.md`](./architecture.md) · [`api.md`](./api.md) · [`handoff.md`](./handoff.md)

Cada entrada es una decisión real tomada durante el desarrollo del
proyecto, en el orden en que se tomaron. Formato: **Contexto** → **Decisión**
→ **Alternativas consideradas** → **Motivos** → **Consecuencias**.

---

## 1. Login con Google opcional, no obligatorio

**Contexto:** la app funcionaba 100% con `localStorage`, un solo
dispositivo. Se quería sincronizar entre dispositivos sin forzar una
cuenta para poder usarla.

**Decisión:** el login con Google (vía Supabase Auth) es opcional. Sin
sesión, la app funciona exactamente igual que antes. Con sesión, además
sincroniza con Supabase.

**Alternativas consideradas:**
- Login obligatorio (gate de acceso) — descartada: rompe el caso de uso
  actual de "abrir y usar" sin fricción.

**Motivos:** el valor principal de la app (checklist diaria) no depende de
la nube; la sincronización es un extra para quien use más de un
dispositivo.

**Consecuencias:** todo el código de sync (`useWorkoutData`, `useProgress`,
`cloudSync.js`) tiene que tolerar `userId === undefined` en cada punto, y
loguearse/desloguearse nunca debe borrar el estado local.

---

## 2. `localStorage` como fuente de verdad inmediata (offline-first)

**Contexto:** con conexión inestable (ej. en el gimnasio), la app no puede
depender de la red para funcionar.

**Decisión:** `localStorage` sigue siendo la fuente de verdad inmediata de
la UI. Supabase es un *destino de sincronización*: los `push*` de
`cloudSync.js` son fire-and-forget, envueltos en try/catch que nunca
propaga el error.

**Alternativas consideradas:**
- Supabase como fuente de verdad única (leer de la red en cada acción) —
  descartada: rompe con mala señal, y agrega latencia a cada tilde de
  checkbox.

**Motivos:** la app tiene que ser usable con mala conexión o sin conexión;
un fallo de red no puede impedir marcar un ejercicio como hecho.

**Consecuencias:** puede haber una ventana breve de desincronización entre
dispositivos (el último cambio local tarda en llegar a la nube). Se acepta
como trade-off razonable para una app personal.

---

## 3. "La nube gana" al loguearse en un segundo dispositivo

**Contexto:** si el usuario se loguea en un dispositivo nuevo que ya tiene
datos de invitado en `localStorage`, hay un conflicto: ¿local o remoto?

**Decisión:** al loguearse, si ya hay una rutina/progreso en la nube, esa
gana y sobreescribe el estado local. Si no hay nada en la nube todavía y sí
hay datos locales de invitado, esos se migran subiéndolos (una sola vez).

**Alternativas consideradas:**
- Merge campo por campo — descartada: mucha complejidad para un beneficio
  marginal en una app de un solo usuario por cuenta.
- "Local gana siempre" — descartada: rompe el caso de uso principal
  (loguearse en el celular después de haber usado la app en otro celular).

**Motivos:** "una rutina activa por usuario" ya era la regla existente
(subir un Excel nuevo reemplaza al anterior); este es el mismo principio
aplicado a multi-dispositivo.

**Consecuencias:** si un usuario edita en dos dispositivos sin loguearse en
ambos a la vez, puede perder cambios del que no sincronizó primero. Es un
riesgo aceptado, documentado acá.

---

## 4. Menú lateral (drawer) en vez de un router

**Contexto:** al agregar Open Tracker se necesitaba una segunda "pantalla"
además de la vista principal de la rutina.

**Decisión:** un estado simple en `App.jsx` (`screen: 'routine' |
'open-tracker'`) conmuta qué se renderiza — no se introdujo ningún router.

**Alternativas consideradas:**
- `react-router-dom` — descartada: la app no tiene URLs que deban ser
  compartibles/bookmarkeables ni un árbol de navegación real, solo 2
  pantallas. Un router sería una dependencia nueva sin beneficio real.

**Motivos:** simplicidad — la app ya usaba este mismo patrón para el
branch `!workoutData` (pantalla de carga) antes de Open Tracker.

**Consecuencias:** si en el futuro se agregan más de 2-3 pantallas con
necesidad real de navegación (deep links, historial del navegador), este
patrón dejaría de alcanzar y valdría la pena reevaluar un router.

---

## 5. Netlify Functions como runtime de la API (no un servidor separado)

**Contexto:** Open Tracker necesitaba código server-side por primera vez
en el proyecto (para no exponer la service role key de Supabase).

**Decisión:** la API vive en Netlify Functions v2, en el mismo sitio ya
desplegado (`gym-tracker-425`), con el path declarado directamente en cada
función (`export const config = { path: '/api/v1/routine' }`).

**Alternativas consideradas:**
- Servidor Node/Express separado (Railway, Render, Fly, etc.) — descartada:
  suma infraestructura nueva para desplegar y monitorear, sin necesidad
  real dado el volumen esperado (uso personal + agentes).

**Motivos:** cero infraestructura nueva, mismo dominio, mismo flujo de
deploy que ya se usaba.

**Consecuencias:** el proyecto queda atado a las capacidades y límites de
Netlify Functions (timeouts, cold starts, límites de tamaño de bundle). Si
en el futuro la API necesita procesos de larga duración o WebSockets, esta
decisión habría que revisarla.

**Actualización:** al momento de tomar esta decisión, el deploy era manual
vía `netlify deploy --prod --dir=dist`. El sitio luego se conectó a GitHub
para CI/CD (push a `main` dispara build + deploy automático) — no cambia
la decisión de usar Netlify Functions, solo el mecanismo de disparo del
deploy. Ver [`README.md`](../README.md#cómo-desplegarlo).

---

## 6. Cómo autentica la API contra Supabase

**Contexto:** un request autenticado por API Key no trae un JWT de sesión
de Supabase, así que Row Level Security (RLS) no tiene forma de aplicarse
directamente.

**Decisión:** las Functions usan la **service role key** de Supabase
(bypassea RLS) y resuelven `user_id` a partir de la API Key
(`netlify/functions/_lib/auth.js`), filtrando manualmente por `user_id` en
cada query.

**Alternativas consideradas:**
- Mintear un JWT de Supabase de corta duración por request, impersonando
  al usuario, y mantener RLS como único modelo de autorización —
  descartada: agrega complejidad (mintear, expirar) sin necesidad real,
  dado que las Functions son código propio y confiable.

**Motivos:** más simple y estándar para un backend propio; la tabla
`api_keys` sigue protegida por RLS para el acceso *del frontend* a su
propia key.

**Consecuencias:** la autorización de la API vive en código de aplicación,
no en la base de datos — cualquier query nueva en las Functions tiene que
acordarse de filtrar por `user_id` a mano (RLS no lo hace por vos acá).

---

## 7. API Key en texto plano, protegida por RLS (no hash-only)

**Contexto:** la pantalla "Open Tracker" tiene que poder mostrar la API Key
al usuario, con un botón de copiar. Regenerar la key **no** está en el
alcance de esta iteración.

**Decisión:** la key se guarda en texto plano en la tabla `api_keys`, con
RLS (`auth.uid() = user_id`) — el mismo patrón ya usado para
`routines`/`progress`/`history`.

**Alternativas consideradas:**
- Hash-only (SHA-256), mostrando la key una única vez al generarla (patrón
  GitHub/Stripe) — descartada **para esta iteración**: sin un flujo de
  "regenerar" implementado, un usuario que pierda de vista su key quedaría
  sin ninguna forma de volver a verla — un callejón sin salida funcional,
  no solo una diferencia de seguridad.

**Motivos:** consistente con "no busco una solución enterprise"; el resto
de los datos del usuario ya confían en RLS de la misma forma.

**Consecuencias:** si el backup de la base de datos se filtrara, las keys
serían usables directamente (sin necesitar crackear un hash). **Cuando se
implemente "regenerar" key, esta decisión debería revisarse** y migrar a
hash-only + flujo de "mostrar una sola vez".

---

## 8. Rate limiting respaldado en Postgres (no en memoria ni servicio externo)

**Contexto:** Netlify Functions son efímeras — no hay memoria compartida
confiable entre invocaciones para contar requests.

**Decisión:** contador de ventana fija (1 minuto) en una tabla
`api_rate_limits`, incrementado atómicamente vía el RPC
`increment_rate_limit` (upsert con `ON CONFLICT ... DO UPDATE`).

**Alternativas consideradas:**
- Contador en memoria del proceso de la Function — descartada: no
  sobrevive entre invocaciones/instancias, da una protección ilusoria.
- Servicio externo (ej. Upstash Redis) — descartada: suma una dependencia
  e infraestructura nueva para un problema que Postgres ya resuelve bien a
  esta escala.
- Rate limiting nativo de la plataforma (Netlify) — descartada por ahora:
  depende de configuración de plataforma no versionable en el repo.

**Motivos:** reusa infraestructura ya existente (Supabase), es portable, y
se pudo testear de punta a punta con `netlify dev` + `curl` (confirmado:
60 requests pasan, 61+ devuelven `429` dentro de la misma ventana).

**Consecuencias:** cada request de la API implica un round-trip extra a
Postgres (el RPC). Aceptable para el volumen esperado; no sería la
elección correcta para tráfico de muy alto volumen.

---

## 9. El frontend no migra a consumir su propia API todavía

**Contexto:** la visión de largo plazo es que "el frontend sea un cliente
más" de la misma API que consumirán agentes externos y el futuro MCP.

**Decisión:** en esta iteración, el frontend **sigue hablando directo con
Supabase** (`cloudSync.js`, con `anon`/`publishable` key + RLS). Lo que sí
se comparte de verdad es la capa de dominio (`src/domain/routine.js`).

**Alternativas consideradas:**
- Migrar `useWorkoutData`/`useProgress` para que llamen a
  `/api/v1/routine` en vez de a Supabase directo — descartada **por
  ahora**: es un cambio de mayor riesgo (podría romper el flujo de
  login+sync ya en producción) que no pedían los objetivos concretos de
  esta iteración.

**Motivos:** priorizar no romper una funcionalidad ya desplegada y
funcionando; la migración es coherente con la visión pero no urgente.

**Consecuencias:** hoy hay **dos caminos de escritura** a la tabla
`routines` (frontend vía RLS, API vía service role) que comparten el mismo
mapeo de dominio pero no el mismo código de acceso a datos. Es una
duplicación *aceptada y documentada*, no accidental. Migrar el frontend a
consumir su propia API es el próximo paso natural — ver
[`roadmap.md`](./roadmap.md).

---

## 10. Dominio compartido (`src/domain/routine.js`) entre Excel y API

**Contexto:** había que evitar que "qué es una rutina válida" se definiera
dos veces (una para el importador de Excel, otra para el body del `PUT`).

**Decisión:** un módulo sin dependencias de React/navegador/Supabase
(`src/domain/routine.js`) concentra validación (`assertValidRoutine`),
normalización (`normalizeRoutine`) y mapeo DTO↔fila
(`toRoutineRow`/`fromRoutineRow`). Tanto `useWorkoutData.js` (Excel) como
`netlify/functions/routine.js` (API) lo llaman.

**Alternativas consideradas:**
- Validar solo en la API y confiar ciegamente en el importador de Excel —
  descartada: funciona hoy porque el parser siempre produce datos válidos
  por construcción, pero deja la puerta abierta a que diverjan con el
  tiempo.

**Motivos:** requisito explícito del proyecto ("no quiero lógica
duplicada"); además dejarlo así hace trivial agregar
`POST /api/v1/routine/validate` más adelante (ya usa la misma función).

**Consecuencias:** cualquier cambio a "qué es una rutina válida" se hace en
un solo lugar y automáticamente afecta a ambos transportes — es el
resultado buscado.

---

## 11. Zod como fuente de verdad del spec de OpenAPI (no un spec escrito a mano)

**Contexto:** al construir el "API Playground" de Open Tracker había que
elegir de dónde sale la especificación OpenAPI que lo alimenta. Un spec
escrito a mano (YAML/JSON separado) diverge del código apenas alguien
cambia `src/domain/routine.js` sin acordarse de actualizarlo también.

**Decisión:** `src/domain/routine.js` reemplazó su validación hecha a mano
por schemas de [Zod](https://zod.dev/) (`ExerciseSchema`, `DaySchema`,
`RoutineInputSchema`). Esos mismos schemas se reusan en
`netlify/functions/_lib/openapiSpec.js` para generar el documento OpenAPI
vía [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) —
una sola definición de "qué es una rutina válida" sirve para validar en
runtime **y** para documentar.

**Alternativas consideradas:**
- Anotar a mano con JSDoc + `swagger-jsdoc` — sigue separando "la
  validación" de "el spec" en dos lugares distintos (código vs.
  comentarios), mismo riesgo de divergencia que escribirlo a mano, solo
  que más disimulado.
- Mantener el spec como un YAML/JSON versionado a mano — descartada por la
  razón de arriba: es exactamente lo que la plataforma quería evitar.

**Motivos:** por construcción, el spec **no puede** divergir de la
validación real — están hechos del mismo objeto. `zod-to-openapi` existe
específicamente para este caso de uso (su propio README lo dice
explícitamente).

**Consecuencias:** `zod` (~4) pasó a ser una dependencia del bundle del
navegador además del servidor (es chica, sin dependencias propias — el
build midió un incremento de ~16 KB gzip en el bundle principal).
`@asteasolutions/zod-to-openapi` es server-side only (nunca se importa
desde `src/`). Un detalle no obvio de implementación: `extendZodWithOpenApi(z)`
no parchea retroactivamente schemas ya construidos — tiene que correr
antes de que `src/domain/routine.js` se evalúe por primera vez en el
proceso, por eso `openapiSpec.js` lo importa con un `import()` dinámico
después de llamar `extendZodWithOpenApi`, en vez de un `import` estático
normal (los imports estáticos de ES modules se resuelven antes que el
cuerpo del archivo que los declara).

---

## 12. Scalar en vez de Swagger UI para el Playground

**Contexto:** había que elegir qué renderiza la documentación interactiva
("Playground") a partir del spec de OpenAPI, con soporte real para
ejecutar requests y autenticarse con la API Key del usuario con la menor
fricción posible.

**Decisión:** [`@scalar/api-reference-react`](https://github.com/scalar/scalar)
(`ApiReferenceReact`), con `configuration.authentication.securitySchemes.bearerAuth.token`
pre-cargado con la key real del usuario.

**Alternativas consideradas:**
- **Swagger UI** (`swagger-ui-react`) — la opción "de siempre". Medido en
  el registro de npm: **~7.3 MB sin comprimir**. Soporta "try it out", pero
  la API exacta de pre-autenticación (`preauthorizeApiKey`) es menos
  directa para un scheme `http bearer` y varía entre versiones.
- **Redoc** — buena referencia visual, pero su versión gratuita no ejecuta
  requests reales ("try it out"); no cumplía el requisito explícito de
  poder "ejecutar requests directamente".

**Motivos:** Scalar mide **~382 KB sin comprimir — 19x más liviano** que
Swagger UI (confirmado en el registro de npm), soporta ejecución real de
requests, y su configuración de autenticación con Bearer token está
documentada de forma directa y explícita — justo lo que pedía "menor
fricción posible".

**Consecuencias:** el paquete internamente usa Vue (no React) por debajo
del wrapper `api-reference-react` — es un detalle de implementación de
Scalar, invisible desde nuestro código, pero explica por qué `npm install`
trajo dependencias de Vue al proyecto. El componente se carga con
`React.lazy` (`src/components/openTracker/Playground.jsx`) para que su
peso (~443 KB de JS + ~250 KB de CSS, verificado en el build) nunca forme
parte del bundle principal de la app de uso diario — confirmado en build
que ambos quedan en chunks separados, cargados solo al abrir el
Playground.

---

## 13. Endpoints internos para el authorization server de `gym-tracker-mcp`

**Contexto:** `gym-tracker-mcp` (repo separado, servidor MCP) quería
reemplazar su gate de OAuth de "una API Key compartida de un solo dueño"
por un login real de Google, resolviendo automáticamente qué cuenta de
Gym Tracker corresponde a esa sesión — sin que ese repo tuviera que
acceder a Supabase directamente (su principio explícito es no tener
acceso directo a la base). Hacía falta que `gym-tracker` expusiera esa
capacidad de alguna forma.

**Decisión:** dos Netlify Functions nuevas, fuera del contrato público
`/api/v1` (no aparecen en `docs/api.md` ni en el spec de OpenAPI):

- `GET /internal/mcp/identity` (`netlify/functions/mcp-identity.js`):
  recibe `Authorization: Bearer <supabase_access_token>` (una sesión real
  de Supabase Auth, la misma que usa el login con Google de la app),
  la verifica con `getSupabaseAdmin().auth.getUser(token)`, garantiza
  (get-or-create) que exista una fila en `api_keys` para ese usuario
  (`netlify/functions/_lib/apiKeys.js`, espejo server-side de
  `src/utils/apiKeys.js`), y devuelve **solo** `{userId, email}` — nunca
  la API Key. CORS restringido a `https://gym-tracker-mcp.netlify.app`
  (el único llamador legítimo desde un navegador).
- `POST /internal/mcp/api-key` (`netlify/functions/mcp-api-key.js`):
  server-to-server únicamente, gateado por un secreto compartido
  (`MCP_SERVICE_SECRET`, header `X-Mcp-Service-Secret`, comparado con
  `crypto.timingSafeEqual`), sin CORS. Dado un `userId`, devuelve la API
  Key real de esa cuenta.

**Alternativas consideradas:**
- **Sumar esto al contrato público `/api/v1`** — descartada: son
  endpoints con un único caller conocido (`gym-tracker-mcp`) y semántica
  muy distinta a la API de rutinas; mezclarlos en el mismo spec de
  OpenAPI/Playground público confundiría a cualquier desarrollador
  externo real.
- **Que `gym-tracker-mcp` tuviera su propia copia de la service role key
  de Supabase** — descartada de plano: la service role key bypasea RLS
  por completo; darle esa llave a un segundo repo multiplica el radio de
  impacto de cualquier fuga sin necesidad, cuando dos endpoints acotados
  alcanzan.
- **Devolver la API Key directamente en `/internal/mcp/identity`** (un
  solo endpoint en vez de dos) — descartada: ese endpoint lo llama el
  navegador (para mostrar el email antes de consentir); la API Key real
  nunca debería estar disponible client-side bajo ningún flujo.

**Motivos:** mantiene `gym-tracker-mcp` fiel a su propio principio ("sin
acceso directo a Supabase") sin que este repo tenga que exponer más
superficie de la estrictamente necesaria — dos endpoints angostos, cada
uno con un solo propósito y un solo caller esperado.

**Consecuencias:** `MCP_SERVICE_SECRET` puede resolver la API Key de
**cualquier** `user_id` — se trata con el mismo cuidado operativo que
`SUPABASE_SERVICE_ROLE_KEY` (solo en `netlify env`, nunca logueado,
`timingSafeEqual` en la comparación). Ver el detalle completo del flujo
del lado de `gym-tracker-mcp` en
[`gym-tracker-mcp/docs/decisions.md` #11](../../gym-tracker-mcp/docs/decisions.md#11-consentimiento-vía-login-real-de-google-supabase-auth-no-una-api-key-compartida).

---

## 14. Benchmark de peso por ejercicio requiere login (excepción puntual a la ADR #1)

**Contexto:** la Etapa 8 (ver [`roadmap.md`](./roadmap.md) y
[`etapa-8-analisis.md`](./etapa-8-analisis.md)) agrega un campo de peso
por ejercicio, guardado en una tabla nueva (`exercise_benchmarks`) para
que el usuario vea qué carga usó la última vez. Es la primera
funcionalidad de la app que **no** funciona en modo invitado.

**Decisión:** el campo de peso no se muestra en absoluto sin sesión
(`showWeight = Boolean(user)` en `App.jsx`, mismo patrón `{user && (...)}`
que ya gatea el ítem de Open Tracker en `SideMenu.jsx`) — no un campo
deshabilitado con un cartel, directamente ausente.

**Alternativas consideradas:**
- Guardar el benchmark también en `localStorage` para invitados, sin
  sync — descartada: un benchmark que desaparece si el usuario cambia de
  dispositivo o borra datos del navegador contradice la idea misma de
  "benchmark" (algo que se espera que persista).

**Motivos:** la ADR #1 sigue vigente como decisión general ("login
opcional, no obligatorio") — esto no la revierte, es una excepción acotada
a una sola feature nueva, donde el valor de la feature (comparar contra un
historial) depende inherentemente de que los datos persistan más allá de
un dispositivo/sesión de invitado.

**Consecuencias:** a partir de acá, cualquier feature que dependa de
`exercise_benchmarks` o de `training_sessions` (Etapa 9, mismo criterio)
hereda este mismo requisito de login — no hace falta repetir esta
decisión, solo referenciarla.
