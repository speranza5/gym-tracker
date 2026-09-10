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
| Texto del CTA | "Entrar" — corto y neutro, sirve igual para alguien nuevo o con cuenta ya creada; nunca menciona "Google" en el botón, el mecanismo de login queda en letra chica debajo |
| Estilo del CTA | Botón grande, relleno con `--accent` (mismo peso visual que `.modal__save`), no el botón chico `.auth-button--signin` que hoy vive en una esquina |
| ¿Es gratis y lo decimos? | Sí — no hay Stripe/billing/pricing en ningún lado del código (confirmado por búsqueda), y no hay planes pagos propios. Se dice explícito en la FAQ ("¿Es gratis?") |
| Orden de los pilares | Trackeo primero, IA segundo — decisión de diseño (el usuario delegó el criterio): "Gym Tracker" genera la expectativa de trackeo, así que ese pilar orienta primero; la IA aparece después como el diferencial, no como lo primero que hay que entender para saber qué es la app |
| ¿Prueba visual (capturas reales)? | Sí — capturas reales del producto, no ilustraciones. Ver "Capturas: qué se muestra y qué no" abajo para el límite de honestidad en el pilar de IA |
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

Se aprobó sumar capturas reales del producto a los pilares. El mismo
criterio de precisión de la sección anterior aplica acá — con un matiz
nuevo por pilar:

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

## Contenido de la landing

**Asunción a confirmar** (copy concreto, fácil de ajustar sin tocar
estructura). Seis secciones, en este orden: hero → pilar de trackeo →
pilar de IA → Open Tracker (marca) → FAQ → CTA de cierre.

### 1. Hero

- **Ícono + nombre:** `Dumbbell` (ya usado en el header de la app) + "Gym
  Tracker".
- **Título (H1):** "Trackeá tu rutina y dejá que tu IA te ayude a
  armarla y seguirla."
- **Subtítulo:** "Registrá cada entrenamiento y mirá tu progreso real —
  racha, consistencia, cuánto subiste de peso en cada ejercicio —
  mientras charlás con Claude, ChatGPT o el asistente que uses para
  armar o ajustar tu rutina. Simple, sin que tengas que tocar una
  planilla si no querés."
- **CTA primario:** "Entrar" (grande, `.landing__cta`).
- **Letra chica debajo del CTA:** "Con tu cuenta de Google, en un
  toque — gratis."

### 2. Pilar — Trackeá cada entrenamiento, no lo memorices

Va primero: es la expectativa que genera el nombre "Gym Tracker", así
que orienta antes de que aparezca el diferencial de IA.

Intro de la sección (1-2 líneas, antes de los 3 puntos): "Marcá cada
ejercicio a medida que lo hacés y dejá que la app se acuerde por vos —
racha, consistencia y progreso quedan guardados solos, sincronizados en
cualquier dispositivo. **Esto es lo que te da insights reales para
mejorar — no a ojo, con tus propios números.**"

**Captura:** gráfico de progresión de cargas (Etapa 11) o la checklist
diaria — real, sin retocar (ver "Capturas" arriba).

1. **`ListChecks` — "Checklist diaria, sin fricción."** Marcá cada
   ejercicio en modo lista o enfocado uno a la vez; el progreso se
   resetea solo al otro día, no tenés que acordarte de "limpiar" nada.
2. **`CalendarCheck` — "Consistencia real, no memoria."** Mirá cuántos
   días entrenaste por semana, mes o año, y qué ejercicios repetís más
   — sin tener que llevar la cuenta vos.
3. **`LineChart` — "Progresión de cargas, con gráfico."** Cada peso que
   cargás queda guardado: un gráfico te muestra cómo fuiste subiendo en
   cada ejercicio, sesión por sesión — no si "te parece" que mejoraste.

### 3. Pilar — Armá y seguí tu rutina charlando con tu IA

Intro de la sección: "Conectá Claude, ChatGPT o cualquier asistente
compatible con MCP a Open Tracker, la API abierta de Gym Tracker, y
manejá tu rutina por chat."

**Captura:** pantalla real "Conectar MCP" (`ConnectMcp.jsx`) — no una
conversación de chat simulada (ver "Capturas" arriba).

1. **`Bot` — "Armala charlando."** Pedile a tu asistente de IA que arme
   tu rutina desde cero, o que la ajuste cuando cambies de objetivo —
   sin abrir un Excel ni la app.
2. **`MessageCircle` — "Seguila sin abrir la app."** Preguntale qué te
   toca hoy o qué ejercicios tenés pendientes — tu asistente lee tu
   rutina real, no inventa nada.

Nota secundaria, sin tarjeta ni ícono propio, una sola línea al pie de
esta sección (de-enfatizada a propósito, ver v1 de este documento): "¿Ya
tenés tu rutina armada en un Excel? También podés subirla tal cual está."

### 4. Open Tracker — la plataforma detrás de la IA

Sección propia, no solo una mención dentro del pilar de IA (decisión de
esta v3: "protagonismo propio"). Reposiciona lo que en la Etapa 5/7 era
un detalle técnico (Developer Platform, MCP) como un diferencial de
marca para quien lee la landing.

- **Título:** "Open Tracker: no es solo una app, es una plataforma
  abierta."
- **Copy:** "Tu rutina no vive encerrada acá adentro. Vive en una API
  abierta — el mismo motor que usa esta misma app — que cualquier
  asistente compatible con MCP puede leer y escribir con tu
  autorización. Hoy Claude y ChatGPT; mañana, lo que uses. Vos elegís
  qué conectar, y podés desconectarlo cuando quieras."
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
2. **"¿Para qué necesito iniciar sesión con Google?"** → "Solo para
   identificarte y sincronizar tu rutina, progreso e historial entre
   tus dispositivos. No se usa para nada más."
3. **"¿Es seguro conectar una IA a mi rutina?"** → "Sí — la conexión usa
   tu propia cuenta y tu propia API Key, que podés revocar cuando
   quieras. Un asistente conectado solo puede ver y editar tu rutina,
   nada más."

### 6. CTA de cierre

- Título corto reforzando los dos pilares: "Trackeá todo. Dejá que tu IA
  arme y ajuste. Vos solo entrená."
- Repite el mismo CTA primario ("Entrar") al final de la página, para
  quien llegó hasta acá sin loguearse todavía.
- Línea de refuerzo arriba del botón: "Gratis, sin tarjetas ni
  configuración — tu cuenta de Google alcanza para empezar."

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

- [ ] Tomar las 3 capturas reales (gráfico de progresión o checklist;
      `ConnectMcp.jsx`; Playground/Reference de Open Tracker) y
      guardarlas en `src/assets/landing/` (carpeta nueva).
- [ ] `Landing.jsx` (hero, pilar de trackeo, pilar de IA, sección Open
      Tracker, FAQ, CTA de cierre) + CSS (`.landing`, `.landing__hero`,
      `.landing__pillar`, `.landing__open-tracker`, `.landing__faq`,
      `.landing__closing-cta`, `.landing__cta`).
- [ ] Gate nuevo en `App.jsx`: `authLoading` → loading mínimo; `!user` →
      `Landing`; el resto sigue igual.
- [ ] Sacar `authLoading`/`onSignIn` de las props de `FileUpload.jsx` y
      `SideMenu.jsx`.
- [ ] Sacar la rama `!user` de `AuthButton.jsx` (queda sin caller tras el
      punto anterior).
- [ ] Actualizar `README.md` (`## Objetivo`, punto 1).
- [ ] Confirmar visualmente en el browser: landing se ve bien en mobile
      (~400px, incluido el scroll de las 6 secciones), los dos pilares
      (trackeo / IA) se leen con el mismo peso visual, las capturas no
      recortan mal en mobile, el FAQ se expande/colapsa correctamente,
      ambos CTA ("Entrar") redirigen a Google, y no hay parpadeo
      landing→app para una sesión ya activa al recargar.
