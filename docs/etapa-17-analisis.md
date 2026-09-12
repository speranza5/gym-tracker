# Etapa 17 — Animaciones y microinteracciones

> Análisis funcional previo a implementar, **escrito en el formato que
> consume GSD Core**: requisitos con ID, roadmap de sub-fases, y por cada
> sub-fase su contexto cerrado y su verificación. Sirve como input de
> `/gsd-new-project` / `/gsd-plan-phase` y como el spec de etapa de este
> repo. Ver también: [`roadmap.md`](./roadmap.md) ·
> [`decisions.md`](./decisions.md) · [`architecture.md`](./architecture.md) ·
> [`CONTRIBUTING_AI.md`](./CONTRIBUTING_AI.md)

## Objetivo

La app no tiene sistema de motion. Tiene **ocho transiciones
hardcodeadas** repartidas en `src/App.css`, con cuatro duraciones
distintas y sin ninguna relación entre sí, y **ningún cambio de pantalla
tiene transición**. Esta etapa no "agrega animaciones": define un sistema
mínimo de motion, migra lo que ya existe a ese sistema, y recién después
suma gestos nuevos donde aportan.

Inventario actual, verificado (`src/App.css`):

| Línea | Transición | Dónde |
|---|---|---|
| 145 | `width 0.3s ease` | barra de progreso |
| 224 | `opacity 0.2s ease` | — |
| 291 | `border-color 0.15s ease` | input/dropzone |
| 329 | `transform 0.2s ease` | chevron que rota |
| 492 | `animation: spin 0.8s linear infinite` | loader |
| 671 | `border-color 0.15s ease` | — |
| 808 | `opacity 0.2s ease` | overlay del drawer |
| 831 | `transform 0.2s ease` | drawer lateral |

Y **`src/index.css` no tiene un solo token de motion** — las 14 variables
que hay son de color, radio y tipografía.

## Esta etapa revierte una decisión documentada

El roadmap dice que la ausencia de transiciones es deliberada, y la
Etapa 14 decidió explícitamente **no** animar Landing↔Login "para no
introducir un patrón de animación aislado". La Etapa 15 aceptó el
`opacity 0.2s` interno de Joyride como **excepción**, no como precedente.

Igual que la Etapa 12 cuando revirtió el modo invitado: **antes de tocar
código va una ADR nueva en `decisions.md`** que supere esa postura y
explique qué cambió — que ya no es un patrón aislado, porque ahora hay un
sistema. Sin esa ADR, esta etapa contradice la documentación del propio
repo.

## Requisitos

| ID | Requisito |
|---|---|
| **R-17.1** | Toda duración y curva de animación sale de una variable CSS en `index.css`. Ningún valor de tiempo hardcodeado nuevo |
| **R-17.2** | La app respeta `prefers-reduced-motion: reduce`: con la preferencia activa, ningún movimiento — ni transiciones, ni transforms, ni el spinner girando |
| **R-17.3** | Las ocho transiciones existentes usan los tokens nuevos, sin cambiar su comportamiento percibido |
| **R-17.4** | Botones y tarjetas tienen feedback de hover, `:active` y `:focus-visible` consistente |
| **R-17.5** | El toast entra y sale con transición, en vez de aparecer y desaparecer de golpe |
| **R-17.6** | Marcar un ejercicio como hecho tiene feedback visual propio |
| **R-17.7** | Llegar al 100% del día tiene un momento visual distinto de pasar de 90% a 95% |
| **R-17.8** | *(Opcional)* Los cambios de pantalla tienen transición |
| **R-17.9** | Ningún componente nuevo. Ninguna librería nueva de animación |
| **R-17.10** | Ninguna animación bloquea una interacción: nada espera a que termine una transición para responder |

## Reglas de ejecución (modelo económico)

Las sub-fases están dimensionadas para un modelo barato. Reglas que
**no** se negocian:

- **Una sub-fase = un concern = un commit.**
- **Máximo 2 archivos por sub-fase.** Si una sub-fase necesita un tercero, está mal cortada.
- **Cada sub-fase es entregable sola.** Si la etapa se abandona en la 17.3, lo hecho queda coherente y desplegable.
- **Ninguna sub-fase depende de una posterior.** Solo de las anteriores.
- **`.planning/` va al `.gitignore`** si se usa GSD: los artefactos de planificación no son documentación del proyecto (esa vive en `docs/`).
- **Verificación = mirar la pantalla.** No hay tests en este repo. Cada sub-fase trae su checklist visual.
- **No refactorizar `App.css` de paso.** Son 2060 líneas; tocar lo que la sub-fase pide y nada más.

## Roadmap de sub-fases

| # | Sub-fase | Archivos | Requisitos | Riesgo |
|---|---|---|---|---|
| 17.1 | Tokens de motion + guard de reduced-motion | `index.css` | R-17.1, R-17.2 | Nulo |
| 17.2 | Migrar las 8 transiciones existentes a tokens | `App.css` | R-17.3 | Bajo |
| 17.3 | Botones y tarjetas: hover / active / focus-visible | `App.css` | R-17.4 | Bajo |
| 17.4 | Toast con entrada y salida | `Toast.jsx`, `App.css` | R-17.5 | Medio |
| 17.5 | Feedback al marcar un ejercicio | `ExerciseCard.jsx`, `App.css` | R-17.6 | Bajo |
| 17.6 | Barra de progreso y momento del 100% | `ProgressBar.jsx`, `App.css` | R-17.7 | Bajo |
| 17.7 | Transiciones entre pantallas *(opcional)* | `App.jsx`, `App.css` | R-17.8 | **Alto** |

Antes de la 17.1: la ADR en `decisions.md`. No es una sub-fase de código.

---

## 17.1 — Tokens de motion + guard de reduced-motion

**Contexto cerrado.** Tres duraciones, no más: las cuatro que hay hoy
(0.15s / 0.2s / 0.3s) colapsan a tres escalones, y el spin queda aparte
por ser un loop, no una transición.

```css
:root {
  --motion-fast: 120ms;    /* feedback directo: hover, active, border */
  --motion-base: 200ms;    /* lo que se mueve o aparece */
  --motion-slow: 320ms;    /* recorridos largos: barra de progreso, drawer */
  --ease: cubic-bezier(0.2, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --spin-duration: 0.8s;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-base: 0ms;
    --motion-slow: 0ms;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Por qué el guard va acá y no al final:** poniéndolo en la 17.1, todas
las sub-fases siguientes lo heredan gratis. Al final habría que auditar
cada animación agregada.

**Por qué `0.01ms` y no `0`:** con `0` algunos navegadores no disparan el
evento `transitionend`, y cualquier código que lo escuche queda colgado.
Es el patrón estándar, no una arbitrariedad.

**Verificación:** nada cambia visualmente todavía. `npm run build` limpio,
y en DevTools → Rendering → *Emulate CSS prefers-reduced-motion* confirmar
que el spinner del loader deja de girar.

## 17.2 — Migrar las 8 transiciones existentes

**Contexto cerrado.** Sustitución mecánica, una por una, sin cambiar el
comportamiento percibido:

| Línea | Antes | Después |
|---|---|---|
| 145 | `width 0.3s ease` | `width var(--motion-slow) var(--ease)` |
| 224 | `opacity 0.2s ease` | `opacity var(--motion-base) var(--ease)` |
| 291 | `border-color 0.15s ease` | `border-color var(--motion-fast) var(--ease)` |
| 329 | `transform 0.2s ease` | `transform var(--motion-base) var(--ease)` |
| 492 | `spin 0.8s linear infinite` | `spin var(--spin-duration) linear infinite` |
| 671 | `border-color 0.15s ease` | `border-color var(--motion-fast) var(--ease)` |
| 808 | `opacity 0.2s ease` | `opacity var(--motion-base) var(--ease)` |
| 831 | `transform 0.2s ease` | `transform var(--motion-base) var(--ease)` |

Los 0.15s pasan a 120ms y los 0.3s a 320ms — diferencias imperceptibles,
aceptadas a cambio de tener tres escalones en vez de cuatro valores
sueltos.

**Verificación:** `grep -n "transition:\|animation:" src/App.css` no
devuelve ningún número literal. Abrir el drawer, tocar un input, ver el
loader: todo se siente igual que antes.

## 17.3 — Botones y tarjetas

**Contexto cerrado.**

- `:hover` solo dentro de `@media (hover: hover)` — en touch, `:hover` se queda pegado después del tap.
- `:active` con `transform: scale(0.97)`, `--motion-fast`. Es el feedback que más se nota en mobile, que es el uso real de esta app.
- `:focus-visible` con `outline: 2px solid var(--accent)` y `outline-offset: 2px`. **No se saca el outline sin reemplazarlo** — hoy el foco de teclado es invisible en varios botones.
- Tarjetas: `border-color` a `--border` → `--accent` en hover, reusando la transición que ya existe.
- **Nada de `box-shadow` nuevo.** El proyecto no usa sombras; introducirlas es una decisión de diseño visual, no de motion.

**Verificación:** en desktop, hover y Tab por los botones del menú y de las tarjetas del empty state. En mobile (o DevTools en modo touch), confirmar que después de tocar un botón no queda con estilo de hover.

## 17.4 — Toast con entrada y salida

**Contexto cerrado.** Acá hay una trampa de React que hay que resolver, no
esquivar.

`Toast.jsx` hoy hace `if (!message) return null`. Un componente que se
desmonta **no puede animar su salida**: desaparece en el mismo frame. La
entrada sí se puede animar tal como está; la salida no.

Solución, sin librerías:

- El Toast se mantiene montado y conmuta una clase (`toast--visible`), en
  vez de devolver `null`.
- Estado local `visible`, y un `useEffect` que lo pone en `true` al llegar
  un `message` y en `false` cuando el timer de 2500ms vence.
- `onDismiss` se llama **después** de la transición de salida, no al
  vencer el timer — si no, el mensaje se va del estado del padre antes de
  que termine de animarse.
- Entrada: `opacity` + `translateY(8px) → 0`, `--motion-base`, `--ease-out`.
- El timer de 2500ms **no cambia**. Es tiempo de lectura, no de animación.

**Verificación:** registrar una sesión y mirar el toast entrar y salir
suave. Registrar dos seguidas rápido y confirmar que el segundo mensaje no
pisa la animación del primero de forma rara. Con reduced-motion activo,
que aparezca y desaparezca instantáneo pero **siga durando los 2500ms**.

## 17.5 — Feedback al marcar un ejercicio

**Contexto cerrado.** Es el gesto más repetido de la app: decenas de veces
por sesión. Por eso tiene sub-fase propia.

- Transición de `opacity` y del check en `--motion-fast`.
- `:active` con `scale(0.98)` sobre la tarjeta entera, no solo el check.
- **Sin animación de "tachado" progresivo** del texto: a la décima vez del
  día molesta. Esto es una decisión, no una omisión.
- El estado se guarda igual de inmediato — la animación es puramente
  visual y nunca retrasa el `toggleExercise`.

**Verificación:** marcar y desmarcar diez ejercicios seguidos y confirmar
que no se siente lento ni se acumula nada. Que el `localStorage` se
actualice igual de rápido que antes.

## 17.6 — Barra de progreso y momento del 100%

**Contexto cerrado.**

- La barra ya tiene `width var(--motion-slow)` desde la 17.2. No se toca más.
- Al llegar a 100%, un pulso **de una sola vez** sobre la barra:
  `@keyframes complete-pulse`, `--motion-slow`, sin `infinite`.
- Se dispara comparando el porcentaje anterior con el nuevo — solo cuando
  **cruza** a 100, no cada render con el día ya completo. Si no, la
  animación se repite cada vez que React renderiza.
- Sin confetti, sin sonido, sin modal. El proyecto no tiene nada de eso y
  esta etapa no es el lugar para agregarlo.

**Verificación:** completar un día y ver el pulso una vez. Navegar afuera
y volver con el día ya al 100%: **no** tiene que pulsar de nuevo.

## 17.7 — Transiciones entre pantallas *(opcional)*

**Contexto cerrado.** Es la sub-fase de riesgo alto y va última, sola.

El problema real: `App.jsx` conmuta pantallas con **early returns** sobre
un solo `screen` state (`if (screen === 'stats') return <StatsView/>`). La
pantalla saliente se desmonta en el mismo frame que entra la nueva, así
que **un cross-fade es imposible sin mantener las dos montadas**, y eso
implica reestructurar el árbol de render de `App.jsx` — el archivo más
central de la app.

Alternativas, en orden de lo que se recomienda:

1. **Solo animar la entrada.** La pantalla nueva hace fade-in + un
   `translateY` corto; la saliente desaparece instantánea. Cero cambios
   estructurales en `App.jsx`, solo una clase de animación en el contenedor
   de cada pantalla. Cubre el 80% de la sensación al 10% del riesgo.
2. Mantener las dos montadas durante la transición, con estado de
   "pantalla saliente". Es lo correcto en abstracto, y es refactorizar el
   render de `App.jsx` por una animación.
3. Meter una librería (`framer-motion`, `react-transition-group`).
   Contradice R-17.9 y el criterio de simplicidad del proyecto.

**Se implementa la 1.** La 2 se documenta como futuro si alguna vez hace
falta de verdad.

**Salida explícita:** si la opción 1 no se siente bien, **esta sub-fase no
se hace y la etapa se cierra igual**. Las sub-fases 17.1 a 17.6 ya
entregan el sistema de motion; las transiciones de pantalla son el extra,
no el objetivo. Abandonarla no deja nada a medias.

**Verificación:** navegar routine → stats → open-tracker → volver, varias
veces y rápido. Confirmar que no queda ninguna pantalla fantasma, que el
scroll no salta, y que tocar dos veces seguido el mismo botón del menú no
rompe nada.

## Fuera de alcance

- **Librerías de animación.** Ver R-17.9.
- **Sombras, gradientes o cambios de paleta.** Esto es motion, no rediseño visual.
- **Confetti, sonido, haptics.**
- **Skeleton loaders.** El proyecto usa el spinner que ya tiene; cambiar el patrón de carga es otra etapa.
- **Animar los gráficos de Recharts** (Etapa 11). Tiene sus propias props de animación y es un mundo aparte.
- **Animar el tour de Joyride** (Etapa 15). Se decidió estático a propósito; esta etapa no lo reabre.
- **Transiciones de tema.** Hay un solo tema (`color-scheme: dark`).

## Documentación a actualizar

- **`docs/decisions.md`** — ADR nueva **antes de la 17.1**: se adopta un sistema de motion, superando la postura de "sin animaciones" de la Etapa 14. Registrar las tres duraciones y el motivo de colapsar cuatro valores a tres, y que el guard de reduced-motion va primero y no último.
- **`docs/architecture.md`** — los tokens de motion viven en `index.css` junto a los de color, y ningún componente define duraciones propias.
- **`docs/handoff.md`** — al cerrar: sistema de motion en la tabla de funcionalidades, y si la 17.7 quedó sin hacer, anotarlo como pendiente explícito con el motivo.
- **`docs/roadmap.md`** — Etapa 17 a ✅ (o ✅ parcial si se saltó la 17.7).
- **`AGENTS.md`** — sumar a Convenciones: las duraciones salen de los tokens de `index.css`, nunca hardcodeadas.

## Checklist de implementación

- [ ] ADR en `docs/decisions.md` (antes de tocar código).
- [ ] 17.1 — tokens + guard. `npm run build`. Verificar con reduced-motion emulado.
- [ ] 17.2 — migrar las 8. Confirmar que `grep` no encuentra números literales.
- [ ] 17.3 — hover/active/focus-visible. Probar con Tab y en touch.
- [ ] 17.4 — Toast. Probar dos toasts seguidos y con reduced-motion.
- [ ] 17.5 — check de ejercicio. Diez marcados seguidos.
- [ ] 17.6 — pulso de 100%. Confirmar que no se repite al volver a la pantalla.
- [ ] 17.7 *(opcional)* — fade-in de entrada. Navegación rápida sin pantallas fantasma.
- [ ] `npm run lint && npm run build` al cerrar cada sub-fase, no solo al final.
- [ ] Actualizar los cinco documentos de arriba.
