# Etapa 12 — Landing pública + login obligatorio

> Análisis funcional previo a implementar. Revierte la ADR #1
> (`decisions.md` #1) — ver la nueva ADR #16 en
> [`decisions.md`](./decisions.md) para el razonamiento completo de
> **por qué** se revierte. Este documento es el **cómo**. Ver también:
> [`roadmap.md`](./roadmap.md)

## Objetivo

Que quien no tenga sesión vea una landing pública explicando qué es Gym
Tracker, con el login como único camino para entrar — en vez de la app
(o del dropzone de Excel) directamente. El modo invitado desaparece.

## Positioning (v4 — reemplaza el framing de "dos features")

**Idea central:** "Tu entrenamiento, conectado con tu IA."

**El loop que tiene que transmitir la landing:**
Entrenás → Gym Tracker registra → tu IA entiende → ajustás y mejorás.

Hasta la v3 de este documento, trackeo e IA se presentaban como dos
beneficios paralelos con el mismo peso, sin relación narrativa entre
ellos ("esto hace la app" + "y además esto otro"). Este feedback pide
algo más fuerte: Gym Tracker **es el lugar donde vive tu entrenamiento**,
y desde ahí **tu IA puede entenderlo y ayudarte a manejarlo** — un
sistema con un loop, no una lista de features sueltas.

**Qué cambia en la práctica con este framing:**
- El hero deja de listar funcionalidades y pasa a comunicar el loop.
- Los dos pilares (trackeo primero, IA segundo — esto no cambia, ver
  tabla abajo) ahora están conectados narrativamente por ese loop, en
  vez de ser dos secciones independientes.
- Se agrega el loop como un elemento visual compacto dentro del hero
  (no como una sección nueva — ver "Mantener las 6 secciones" en la
  tabla de decisiones) y una aclaración de modelo mental (Gym Tracker
  vs. Open Tracker) dentro de la sección 4.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| ¿El modo invitado queda como opción secundaria? | No — desaparece por completo, no hay "Probar sin cuenta" en la landing |
| Datos ya existentes en `localStorage` de sesiones de invitado previas | No se migran ni se leen — quedan huérfanos si esa persona no crea/tiene cuenta |
| Dónde vive el gate | `App.jsx`, un `if (!user)` nuevo antes del `if (!workoutData)` existente |
| Mientras se resuelve la sesión (`authLoading === true`) | Pantalla de carga mínima — nunca se muestra la landing ni un parpadeo landing→app a alguien que en realidad ya tiene sesión |
| Contenido de la landing | Landing comercial de 6 secciones: hero → pilar de trackeo → pilar de IA → Open Tracker (marca) → FAQ → CTA de cierre — no un hero chico con 4 bullets, ver detalle abajo |
| Eje central del mensaje | Dos pilares con el mismo peso: **trackeo** (checklist, racha, progresión — esto es lo que da insights reales para mejorar) e **interacción con la IA** (armar y seguir la rutina por chat vía Open Tracker/MCP). Excel pasa a ser una nota secundaria dentro del pilar de IA, no una sección propia |
| ¿La IA "da insights" en la landing? | No — se promete solo lo que ya existe hoy (`getRoutine`/`replaceRoutine`, Etapa 7 ✅). Los insights (racha, consistencia, progresión de cargas) son del pilar de trackeo, no del de IA. Ver nota de precisión abajo — la Etapa 15 (herramientas MCP de progreso) todavía no está construida |
| Texto del CTA | **Cambia de "Entrar" a "Empezar ahora"** (feedback v4, punto 2) — más orientado a acción y más coherente con el nuevo framing de loop/sistema. Nunca menciona "Google" en el botón; el mecanismo de login queda en letra chica debajo, formato fijo: "Con tu cuenta de Google · Gratis" |
| ¿Se agrega una sección nueva para el loop/modelo mental? | No — feedback v4 punto 7 pide explícitamente mantener las 6 secciones. El loop (puntos 1 y 6 del feedback) se resuelve como un elemento visual compacto **dentro del hero**; el modelo mental Gym Tracker/Open Tracker (punto 5) se resuelve **dentro de la sección 4** (Open Tracker) — ninguno de los dos suma una sección nueva |
| Orden de aparición: beneficio vs. mecanismo técnico (IA) | Se invierte respecto a v3: primero qué puede hacer el usuario con su IA (lenguaje no técnico), después cómo funciona (MCP/Open Tracker) — feedback v4 punto 4. "MCP" ya no aparece en los bullets del pilar de IA, solo en la sección 4 |
| Densidad de texto | Se reduce en toda la landing (feedback v4 punto 7): títulos fuertes + 1 línea de explicación por punto (antes eran 2-3 líneas), capturas reales cargando el resto del peso visual |
| Claim de seguridad en la FAQ | Se reescribe (feedback v4 punto 8): nunca "es seguro" ni "nada más" como afirmación absoluta. Se describe el alcance real de la API Key (lectura/escritura de la rutina únicamente, no expira, no se puede regenerar hoy) — ver FAQ #3 reescrita abajo |
| Estilo del CTA | Botón grande, relleno con `--accent` (mismo peso visual que `.modal__save`), no el botón chico `.auth-button--signin` que hoy vive en una esquina |
| ¿Es gratis y lo decimos? | Sí — no hay Stripe/billing/pricing en ningún lado del código (confirmado por búsqueda), y no hay planes pagos propios. Se dice explícito en la FAQ ("¿Es gratis?") |
| Orden de los pilares | Trackeo primero, IA segundo — decisión de diseño (el usuario delegó el criterio): "Gym Tracker" genera la expectativa de trackeo, así que ese pilar orienta primero; la IA aparece después como el diferencial, no como lo primero que hay que entender para saber qué es la app |
| ¿Prueba visual (capturas reales)? | **Revertido tras implementar y ver en vivo:** se implementaron capturas reales del producto (ver "Capturas" abajo), pero el feedback visual una vez corrida la app localmente fue que se veían mal — se sacaron. La landing quedó sin capturas, solo íconos + copy. Si en algún momento se retoma la idea, el análisis de honestidad de "Capturas" abajo sigue siendo válido como guía |
| ¿Sección de confianza/FAQ? | Sí, sección propia y corta, cerca del cierre — 3 preguntas (gratis, por qué Google, seguridad de conectar una IA). Se descarta a propósito la pregunta "¿qué pasa con mis datos?" porque no existe hoy un flujo de borrado de cuenta — prometerlo en la FAQ sería el mismo tipo de error que prometer insights de IA que no están construidos |
| ¿Protagonismo de "Open Tracker" como marca? | Sí, propio — sección dedicada además de la mención dentro del pilar de IA, ver "4. Open Tracker" abajo |
| Tono de la copy | Se mantiene el tono cercano/informal actual ("vos", frases cortas) — ya es consistente con el resto de la app (ej. "¿Cómo te sentiste?" en `RecordSessionModal.jsx`) |
| Referencia de diseño | [wellhub.com](https://wellhub.com/) — estructura de secciones (hero → cómo funciona → beneficios en profundidad → CTA de cierre) y tono comercial/energético. Ver "Qué se toma y qué no" abajo — no todo el patrón aplica a un producto de un solo usuario |
| Props que dejan de ser alcanzables (`authLoading`/`onSignIn` en `FileUpload`/`SideMenu`) | Se sacan — una vez pasado el gate, `user` siempre existe y `authLoading` siempre es `false` en ese punto del árbol |
| README (`Objetivo` #1: "usable sin login") | Se actualiza como parte de esta etapa, ver abajo |

## Fuera de alcance (pospuesto)

- **Limpieza de `userId`/`user` opcional en el resto del código**
  (`cloudSync.js`, `useWorkoutData.js`, `useProgress.js`,
  `showWeight`/`canRecord` en `App.jsx`, los `{user && (...)}` de
  `SideMenu.jsx`). Documentado explícitamente en la ADR #16 como código
  muerto-pero-inofensivo: sigue tolerando un `userId` ausente que en la
  práctica nunca va a pasar una vez que existe el gate. No se toca en
  esta etapa — es una refactorización mecánica de varios archivos sin
  relación funcional con "agregar una landing", mejor hecha con calma en
  otro momento (o oportunistamente, la próxima vez que alguien ya esté
  tocando uno de esos archivos por otra razón).
- **Migración de datos de invitado** a Supabase en el primer login — ver
  ADR #16, alternativa descartada.
- **Empty state con plantilla/guía MCP para usuario logueado sin rutina**
  — eso es exactamente la Etapa 13, que depende de esta.
- **Welcome tour** (Etapa 14).
- **Modo claro** en la landing — la app entera sigue con
  `color-scheme: dark` fijo (mismo criterio que la Etapa 11).

## Qué se toma de Wellhub y qué no

Wellhub es un marketplace B2B2C (empresas pagan, empleados eligen) — la
mayoría de su landing no aplica a una app personal de un solo usuario.
Lo que sí se adopta y lo que se descarta a propósito:

**Se adopta:**
- Estructura multi-sección con progresión clara: hero → pilares de valor
  en profundidad → CTA de cierre — en vez de un hero chico con una lista
  de 4 bullets y listo.
- Cada beneficio con su propio espacio (título + 2-3 líneas), no solo un
  ícono y una frase — más descriptivo, más "esto te sirve porque...".
- Repetición del CTA (arriba y al final) para no depender de que alguien
  scrollee hasta el fondo para poder entrar.

**Se descarta explícitamente:**
- **Logos de clientes / muro de confianza.** No hay partners ni
  clientes — es un proyecto personal, no una empresa. Incluir logos
  inventados sería directamente falso.
- **Estadísticas de ROI/uso ("61% más retención", "110.000 gimnasios").**
  No hay métricas reales de uso de Gym Tracker para citar. Inventar
  números por efecto retórico es exactamente el tipo de fake social
  proof que rompe la confianza apenas alguien nota que no hay fuente
  detrás — no se hace.
- **Testimonios.** Mismo motivo: no hay usuarios reales para citar
  todavía. Un testimonio inventado es peor que no tener sección de
  testimonios.
- **Doble audiencia (empresa/empleado).** Gym Tracker tiene una sola
  audiencia (la persona que entrena), no hace falta el patrón de
  navegación dual de Wellhub.

## Nota de precisión: qué le promete la landing a la IA (y qué no)

El pedido explícito de esta v2 es "hacer foco" en trackeo + interacción
con la IA. Antes de escribir el copy, separar qué de eso ya existe hoy:

| Lo que la IA puede hacer hoy vía Open Tracker/MCP | Estado |
|---|---|
| Armar la rutina desde cero, charlando (`replaceRoutine`) | ✅ Etapa 7 |
| Ajustarla / actualizarla (`replaceRoutine`) | ✅ Etapa 7 |
| Leerla para responder "¿qué me toca hoy?" (`getRoutine`) | ✅ Etapa 7 |
| Responder "¿cómo vengo?" con datos reales de progreso/racha | ❌ Etapa 15, todavía 💭, sin implementar |

Por eso la landing promete **"armar y seguir la rutina" por chat** (ambas
reales, Etapa 7) pero **no** promete que la IA te da insights de progreso
— eso lo resuelve el pilar de trackeo (Etapas 8-11, todo real: checklist,
racha, estadísticas, progresión de cargas), no una respuesta de chat.
"Buenos insights para mejorar, de forma simple" se cumple con los
gráficos/estadísticas propios de la app, no con una promesa de IA que
todavía no está construida. Si en algún momento se prioriza la Etapa 15,
ahí sí valdría la pena sumar un tercer pilar ("preguntale a tu IA cómo
venís") — no antes.

## Capturas: qué se muestra y qué no

**Revertido después de implementar (ver checklist).** Esta sección
documenta el análisis original — se implementó, se corrió localmente, y
el feedback fue que las capturas se veían mal. Se sacaron del componente
y de `src/assets/landing/`. Queda acá como referencia si se retoma la
idea más adelante, no como estado actual de la landing.

Se había aprobado sumar capturas reales del producto a los pilares. El
mismo criterio de precisión de la sección anterior aplica acá — con un
matiz nuevo por pilar:

- **Pilar de trackeo:** sin riesgo. Captura real de la UI existente (el
  gráfico de progresión de la Etapa 11, o la checklist diaria) — la app
  ya se ve así hoy, no hay nada que dramatizar.
- **Pilar de IA:** acá **no** se arma una captura de chat simulada (una
  conversación con Claude/ChatGPT que en realidad nunca ocurrió) — sería
  el mismo problema que un testimonio inventado, solo que en formato
  captura en vez de cita. En su lugar, se usa una captura real de la
  pantalla **"Conectar MCP"** (`ConnectMcp.jsx`, ya existe en la app) como
  evidencia de que la integración es real y instalable, sin fingir un
  diálogo que no pasó.
- **Sección Open Tracker:** captura real del Playground/Reference
  (`OpenTracker.jsx`/`Playground.jsx`, ya existen) — mismo criterio, solo
  UI real.

**Distinción nueva (v4): diagramas vs. capturas.** El loop de 5 pasos
del hero y el diagrama de 3 nodos (Vos → Gym Tracker → Tu IA) de la
sección 4 **no son capturas** — son gráficos propios, ilustrativos,
hechos con íconos de `lucide-react` + CSS (sin librería nueva). No
pretenden ser una foto de una pantalla real, así que la regla de "nunca
fingir una captura" no aplica de la misma forma — pero sí aplica una
regla equivalente: el diagrama tiene que representar el flujo/relación
real, no una capacidad inventada (ej. no puede sugerir que la IA ya da
insights de progreso, ver "Nota de precisión" arriba).

## Contenido de la landing

**Asunción a confirmar** (copy concreto, fácil de ajustar sin tocar
estructura). Siguen siendo seis secciones (feedback punto 7: "mantener
las 6 secciones"), en este orden: hero → pilar de trackeo → pilar de IA
→ Open Tracker (marca) → FAQ → CTA de cierre. El loop de 5 pasos vive
dentro del hero y el diagrama de 3 nodos dentro de Open Tracker — ninguno
de los dos es una sección nueva.

### 1. Hero

- **Ícono + nombre:** `Dumbbell` (ya usado en el header de la app) + "Gym
  Tracker".
- **Título (H1):** "Tu entrenamiento, conectado con tu IA." — usa la
  idea central del positioning directamente, en vez de listar
  funcionalidades (el H1 de v3 describía *qué hace* la app; este
  comunica *para qué sirve*).
- **Subtítulo (mantiene claro qué hace hoy el producto, feedback punto
  2):** "Registrá cada entrenamiento en Gym Tracker y dejá que tu
  asistente de IA lo entienda — te ayuda a armar tu rutina, seguirla y
  ajustarla cuando lo necesites."
- **Loop visual (nuevo, reemplaza texto adicional — no es una sección
  nueva, ver tabla de decisiones):** franja compacta de 5 pasos,
  ícono + 2-3 palabras cada uno, conectados por flechas (`ArrowRight`
  de `lucide-react`, se apilan verticalmente en mobile en vez de
  cruzarse):
  1. `FileSpreadsheet` — "Armás tu rutina"
  2. `Dumbbell` — "Entrenás"
  3. `ListChecks` — "Gym Tracker registra"
  4. `Bot` — "Tu IA entiende"
  5. `LineChart` — "Ajustás y mejorás"
- **CTA primario:** "Empezar ahora" (grande, `.landing__cta`).
- **Letra chica debajo del CTA:** "Con tu cuenta de Google · Gratis"
  (formato fijo, se repite igual en el CTA de cierre).

### 2. Pilar — No entrenés de memoria. Entrená con datos.

Va primero: es la expectativa que genera el nombre "Gym Tracker", así
que orienta antes de que aparezca el diferencial de IA. Título cambiado
respecto a v3 ("Trackeá cada entrenamiento, no lo memorices") para
liderar con el beneficio antes que con la función — feedback punto 3.

**Bajada (1 línea):** "Cada entrenamiento que registrás se convierte en
consistencia, cargas y progreso reales — no en memoria que se pierde."

**Captura:** gráfico de progresión de cargas (Etapa 11) o la checklist
diaria — real, sin retocar (ver "Capturas" arriba).

Puntos recortados a título fuerte + 1 línea (antes eran 2-3 líneas cada
uno — feedback punto 7, reducir densidad):

1. **`ListChecks` — "Checklist diaria."** Marcá cada ejercicio a medida
   que entrenás, sin fricción.
2. **`CalendarCheck` — "Consistencia real."** Cuántos días entrenaste
   por semana, mes o año — sin llevar la cuenta vos.
3. **`LineChart` — "Progresión con gráfico."** Cómo subís de peso en
   cada ejercicio, sesión a sesión.

### 3. Pilar — Usá tu IA favorita para manejar tu rutina

**Orden invertido respecto a v3 (feedback punto 4):** primero el
beneficio en lenguaje no técnico, después — recién en la sección 4 — el
nombre "Open Tracker" y la mención a MCP. Esta sección ya no menciona
"MCP" en ningún punto.

**Título de sección:** "Usá tu IA favorita para manejar tu rutina."

**Bajada (1-2 líneas, beneficio primero):** "Pedile a Claude, ChatGPT o
el asistente que uses que arme tu rutina, la lea o la ajuste — vos
entrenás, tu IA se encarga de la parte administrativa." Cierra con una
línea más chica, ya adelantando (sin explicar todavía) el mecanismo:
"Por atrás, se conecta a través de Open Tracker — te contamos cómo más
abajo."

**Captura:** pantalla real "Conectar MCP" (`ConnectMcp.jsx`) — no una
conversación de chat simulada (ver "Capturas" arriba).

Puntos recortados a título + 1 línea, sin insights de progreso (siguen
sin existir, ver "Nota de precisión" arriba) y sin jerga técnica:

1. **`Bot` — "Armala charlando."** Pedile que arme tu rutina desde cero
   o la ajuste cuando cambies de objetivo.
2. **`MessageCircle` — "Preguntale qué toca hoy."** Tu asistente lee tu
   rutina real — no inventa nada.

Nota secundaria, sin tarjeta ni ícono propio, una sola línea al pie de
esta sección (de-enfatizada a propósito, ver v1 de este documento): "¿Ya
tenés tu rutina armada en un Excel? También podés subirla tal cual está."

### 4. Open Tracker — así se conecta tu IA con tu entrenamiento

Sección propia, no solo una mención dentro del pilar de IA (decisión de
v3: "protagonismo propio", se mantiene). Además de reposicionar Open
Tracker como diferencial de marca, esta sección ahora resuelve el
**modelo mental** que pedía el feedback (punto 5): que quede clarísimo
qué es cada cosa.

**Diagrama simple (nuevo — 3 nodos, no es una captura ni una sección
nueva, ver "Capturas" arriba para la distinción):**

```
Vos  →  Gym Tracker  →  Tu IA
```

Una frase bajo cada nodo:
- **Vos:** entrenás y decidís.
- **Gym Tracker:** donde vive tu entrenamiento — rutina, progreso,
  historial.
- **Tu IA:** lo entiende y te ayuda a manejarlo, conectada a través de
  Open Tracker.

- **Título:** "Open Tracker: así se conecta tu IA con tu
  entrenamiento." (antes: "no es solo una app, es una plataforma
  abierta" — se mantiene como bajada corta, no como título, para que el
  título mismo ya explique la relación en vez de solo venderla).
- **Copy (recortado, feedback punto 7):** "Gym Tracker es donde vive tu
  entrenamiento. Open Tracker es la API abierta que le da acceso a tu
  IA — el mismo motor que usa esta app. Hoy Claude y ChatGPT; mañana, lo
  que uses."
- **Precisión sobre "desconectar" (feedback punto 8, se corrige acá
  también):** la v3 decía "podés desconectarlo cuando quieras", que se
  prestaba a confundirse con revocar la API Key — **no existe todavía**
  un endpoint de revocación/regeneración (confirmado en `api.md`, sección
  Autenticación). Lo que sí es real hoy: podés dejar de usar la
  integración quitando la conexión desde la configuración de tu propio
  asistente (Claude/ChatGPT) en cualquier momento — eso no depende de
  Gym Tracker. La copy de esta sección ya no promete "desconectar" como
  si fuera una acción del lado de Gym Tracker; el detalle de permisos
  exactos de la API Key vive únicamente en la FAQ (#3 abajo), para no
  duplicar (y arriesgar desincronizar) la misma afirmación en dos
  lugares.
- **Captura:** Playground/Reference de Open Tracker (`OpenTracker.jsx` /
  `Playground.jsx`) — real, sin retocar.
- Ícono de sección: `Share2` (o `Globe` — confirmar cuál lee mejor junto
  al resto de íconos ya elegidos, `Bot`/`MessageCircle` del pilar de IA).

### 5. FAQ (confianza)

Tres preguntas, formato acordeón o lista simple — cerca del cierre, para
resolver objeciones justo antes del CTA final. Se excluye a propósito
"¿qué pasa con mis datos?" (ver nota de precisión más abajo, "Capturas"
y la fila de la tabla de decisiones — no hay flujo de borrado de cuenta
hoy, prometerlo sería el mismo error que prometer insights de IA que no
existen):

1. **"¿Es gratis?"** → "Sí. Gym Tracker no tiene planes pagos ni
   versión premium."
2. **"¿Para qué necesito iniciar sesión con Google?"** → "Para
   identificarte y sincronizar tu rutina, progreso e historial entre
   tus dispositivos."
3. **Reescrita por completo (feedback punto 8 — la versión v3 decía
   "¿Es seguro conectar una IA a mi rutina?" → "Sí... nada más", una
   afirmación absoluta que no está garantizada técnicamente hoy).**
   Nueva pregunta, ya no binaria: **"¿Qué puede hacer exactamente mi
   asistente de IA con mi cuenta?"** →
   "Tu asistente se conecta con tu propia API Key, que hoy le da acceso
   de **lectura y escritura de tu rutina** — no a tu progreso, pesos ni
   historial, eso no es accesible por esta vía todavía. Esa key **no
   expira ni se puede regenerar por ahora**, así que compartila solo con
   asistentes en los que confíes." — permisos exactos confirmados contra
   `docs/api.md` (`GET`/`PUT /api/v1/routine` es todo lo que la API
   expone hoy; sección Autenticación confirma que no hay expiración ni
   endpoint de regeneración).

### 6. CTA de cierre

- **Título corto, reforzando el positioning** (reemplaza la versión v3
  que listaba los dos pilares por separado): "Tu entrenamiento,
  conectado con tu IA."
- Repite el mismo CTA primario ("Empezar ahora") al final de la página,
  para quien llegó hasta acá sin loguearse todavía.
- **Línea de refuerzo:** mismo formato fijo que el hero, por consistencia
  y para reducir densidad (feedback punto 7 — antes eran dos frases
  distintas en hero/cierre, ahora es la misma): "Con tu cuenta de
  Google · Gratis"

## Componente nuevo: `Landing.jsx`

```
src/components/Landing.jsx
```

- Recibe `onSignIn` (de `useAuth().signInWithGoogle`, ya existe) — nada
  más, no necesita `user` (por definición, si se está renderizando,
  `user` es `null`).
- Reusa las variables de `src/index.css`, ningún color nuevo.
- A diferencia de las pantallas existentes (centradas, una sola tarjeta),
  esta es la primera pantalla de la app que scrollea contenido largo —
  estructura de secciones apiladas verticalmente (`.landing__hero`,
  `.landing__pillar` ×2, `.landing__open-tracker`, `.landing__faq`,
  `.landing__closing-cta`), no un contenedor centrado tipo
  `.upload-screen`.
- **Un solo archivo, no una subcarpeta.** Son 6 secciones (creció desde
  las 4 originales con el FAQ y la sección de Open Tracker), pero
  siguen siendo variaciones del mismo patrón visual (título + copy +
  captura, con el FAQ como única sección con estado propio) — no cruza
  el umbral de "3+ componentes con identidad e interactividad propia"
  que `CONTRIBUTING_AI.md` usa como criterio para agrupar en subcarpeta
  (ver `src/components/openTracker/` como el caso que sí lo cruza,
  porque ahí cada sub-vista es una pantalla completa con su propia
  navegación). Cada sección acá es un bloque de JSX dentro del mismo
  `Landing.jsx`, no un componente separado. Si en una iteración futura
  el FAQ o alguna sección gana bastante más lógica propia, ahí sí vale
  la pena reconsiderar esta decisión — no antes.
- **El FAQ sí tiene estado** (qué pregunta está expandida) — mismo
  patrón de acordeón ya usado en `ExerciseProgressChart.jsx` ("Ver como
  lista"), un `useState` simple, sin librería nueva.
- Los puntos de cada pilar, y las preguntas del FAQ, son un `.map()`
  sobre un array de datos local al archivo (`{ icon, title, body }` /
  `{ question, answer }`), no repetición de JSX a mano — mismo criterio
  de no duplicar que ya se usa en `GRANULARITIES` de `StatsView.jsx`.
- **Loop del hero y diagrama de Open Tracker (nuevos en v4):** ambos son
  `.map()` sobre un array chico de pasos/nodos (`{ icon, label }`), con
  un `ArrowRight` de `lucide-react` entre cada uno — mismo patrón que el
  resto de la sección, sin librería de diagramas nueva. En mobile, la
  franja pasa de fila a columna (`flex-direction: column`), con el
  `ArrowRight` rotado 90° en vez de un ícono distinto.
- CTA nuevo en CSS: `.landing__cta` — fondo `--accent`, texto
  `--accent-contrast`, mismo peso que `.modal__save` (`min-height: 52px`,
  `font-weight: 700`), no el estilo chico de `.auth-button--signin`. Se
  usa dos veces (hero y cierre), mismo componente de botón, sin duplicar
  el JSX del botón en sí (extraer un `<LandingCta onClick={onSignIn} />`
  local al archivo si el JSX del botón termina teniendo más de una línea
  de contenido).

**Capturas — dónde viven y qué implica mantenerlas:**
- Primer uso de imágenes rasterizadas en el proyecto (hoy todos los
  íconos son `lucide-react`, sin ningún `.png`/`.jpg`/assets committeados
  — se verificó que no existe convención previa). Van en
  `src/assets/landing/` (carpeta nueva), `.png` optimizado para web,
  importadas como cualquier asset de Vite (`import heroShot from
  '../assets/landing/progress-chart.png'`).
- **Consecuencia aceptada:** estas capturas se desactualizan si cambia
  el diseño de la app (colores, layout de `StatsView`/`ExerciseProgressChart`/
  `ConnectMcp`/`OpenTracker`) — no hay generación automática. Se
  documenta acá como un costo de mantenimiento conocido, no un
  descuido: cada vez que alguien cambie visualmente una de esas
  pantallas, debería acordarse de revisar si la landing quedó
  desactualizada (no hay un test que lo detecte).

## Wiring en `App.jsx`

```jsx
const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()

if (authLoading) {
  return <div className="app-loading">Cargando…</div>
}

if (!user) {
  return <Landing onSignIn={signInWithGoogle} />
}

// a partir de acá, `user` siempre existe — FileUpload y el resto del
// árbol ya no necesitan authLoading/onSignIn
if (!workoutData) {
  return (
    <FileUpload
      onFile={uploadFile}
      loading={loading}
      error={error}
      user={user}
      onSignOut={signOut}
    />
  )
}
```

`.app-loading`: pantalla mínima centrada, mismo criterio que
`.stats-view__loading` (texto simple, sin spinner nuevo) — evita mostrar
la landing a alguien que en realidad ya tiene sesión mientras
`getSession()` resuelve.

**Consecuencia mecánica en `FileUpload.jsx` y `SideMenu.jsx`:** se sacan
las props `authLoading`/`onSignIn` de ambos (y del `<AuthButton>` interno
de cada uno) — quedan solo con la rama "signed in" alcanzable, porque
`AuthButton` ya soporta ambas ramas pero la rama `!user` se vuelve
inalcanzable una vez pasado el gate. `Landing.jsx` no usa `AuthButton`
(tiene su propio CTA grande, ver arriba), así que tras este cambio la
rama `!user` de `AuthButton` queda sin ningún caller en todo el árbol.
Se elimina esa rama de `AuthButton.jsx` (queda un componente que solo
muestra "signed in"), en vez de dejar código muerto sin uso — esto sí es
una limpieza chica, mecánica, acotada a un archivo, distinta de la
refactorización grande que se pospone arriba.

## README

Actualizar `## Objetivo` — el punto 1 ("usable sin login, modo
invitado") deja de ser cierto. Reemplazar por algo en línea con: "que
loguearse sea el único paso de fricción antes de usar la app, y de ahí
en adelante sea simple y rápida."

## Checklist de implementación

- [x] ~~Tomar las 3 capturas reales~~ — hecho, corrido localmente, y
      **revertido**: no se veían bien. Se sacaron los `<img>` de
      `Landing.jsx`, la regla `.landing__shot` de `App.css`, y
      `src/assets/landing/` entero (carpeta borrada). La landing quedó
      solo con íconos (`lucide-react`) + copy, sin imágenes.
- [x] `Landing.jsx` — hero (con el loop de 5 pasos adentro), pilar de
      trackeo, pilar de IA, sección Open Tracker (con el diagrama de 3
      nodos adentro), FAQ, CTA de cierre — + CSS (`.landing`,
      `.landing__hero`, `.landing__loop`, `.landing__pillar`,
      `.landing__open-tracker`, `.landing__faq`, `.landing__closing-cta`,
      `.landing__cta`).
- [x] Gate nuevo en `App.jsx`: `authLoading` → loading mínimo; `!user` →
      `Landing`; el resto sigue igual.
- [x] Sacar `authLoading`/`onSignIn` de las props de `FileUpload.jsx` y
      `SideMenu.jsx`.
- [x] Sacar la rama `!user` de `AuthButton.jsx` (queda sin caller tras el
      punto anterior) — ahora siempre asume `user` presente.
- [x] Actualizar `README.md` (`## Objetivo` punto 1, y de paso la línea de
      "Características principales" que todavía describía login opcional
      — quedó desactualizada por el mismo cambio y no estaba en el
      checklist original).
- [x] Confirmar visualmente en el browser: landing se ve bien en mobile y
      desktop (Chrome headless, con un hallazgo de tooling documentado
      abajo), el loop de 5 pasos y el diagrama de 3 nodos se leen bien
      apilados sin flechas cruzadas, los dos pilares se leen con el mismo
      peso visual, ambos CTA dicen "Empezar ahora", y `npm run
      lint`/`npm run build` pasan limpios. **Repetido en local por el
      usuario** (`npm run dev`) — feedback real: las capturas de pantalla
      se veían mal, se sacaron (ver arriba).

**Nota de la verificación visual — falso positivo de tooling:** la
primera pasada de screenshots (vía `chrome --headless --screenshot
--window-size=400,...`) mostraba texto cortado a mitad de palabra en
todos los títulos. Se investigó a fondo (se sospechó primero un bug real
de `min-width` en flex con las imágenes nuevas, y se agregó `min-width:
0` a `.landing`/`.landing__pillar`/`.landing__shot` como hardening
defensivo — queda en el código, es inofensivo y buena práctica, pero
**no** era la causa) hasta confirmar, inyectando un `getBoundingClientRect()`
temporal, que el modo headless clásico de Chrome fuerza un piso de
~500px de ancho de layout aunque se pida `--window-size=400`, mientras la
imagen de salida sí respeta el ancho pedido — o sea, la captura recortaba
la mitad derecha de una página perfectamente bien maquetada. Con
`--window-size` ≥500 la landing se ve correcta en mobile y desktop, sin
overflow real. Vale la pena recordar esto si se vuelve a testear
visualmente con este mismo método.
