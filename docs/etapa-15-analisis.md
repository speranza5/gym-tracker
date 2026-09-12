# Etapa 15 — Welcome tour de primer login

> Análisis funcional previo a implementar. Depende de la
> [Etapa 13](./etapa-13-analisis.md) (empty state de 3 caminos, ya en
> producción) — recorre exactamente esas tarjetas. Ver también:
> [`roadmap.md`](./roadmap.md) · [`decisions.md`](./decisions.md)

## Objetivo

Que quien inicia sesión por primera vez y cae en el empty state de la
Etapa 13 (3 tarjetas: Excel, plantilla, IA) vea un recorrido guiado de
spotlight/tooltips que le explique esas tres opciones, una sola vez.

## Decisiones ya tomadas

15 preguntas respondidas antes de especificar (roadmap describe esto
como 💭, sin diseño previo — a diferencia de Etapas 11/12 que ya
arrancaban con contexto):

| Pregunta | Decisión |
|---|---|
| ¿Dónde vive "ya vio el tour"? | Tabla nueva `profiles` en Supabase (primera tabla de "datos de usuario" del proyecto, ver más abajo) — persiste entre dispositivos, coherente con el resto de la app |
| ¿Qué cuenta como "primera vez"? | Solo cuentas nuevas de acá en adelante — usuarios existentes se marcan como "ya visto" retroactivamente en la migración (ver "Backfill" abajo), no ven el tour aunque hoy no tengan rutina cargada |
| ¿Tour interrumpido (cierre de pestaña a mitad)? | No se vuelve a mostrar — se marca como visto apenas arranca (al decidir mostrarlo), no al completarlo |
| ¿Se puede volver a ver? | Sí, pero **no** desde `SideMenu.jsx` (ver conflicto real más abajo) — un link "Ver tutorial de nuevo" dentro del propio `FileUpload.jsx` |
| Cantidad de pasos | 3, uno por tarjeta (Excel, plantilla, IA) — ninguno extra para el botón de refresh de la Etapa 13 |
| ¿Arranca en el beacon o en el tooltip? | Directo en el **tooltip** del paso 1, con el spotlight ya puesto sobre la tarjeta de Excel — no en el beacon (el puntito pulsante que hay que clickear). Se logra con `skipBeacon: true` en el primer step (ver "Nota de precisión: el beacon del paso 1" abajo) |
| Alcance | Solo el empty state — no adelanta Stats/Open Tracker, que ni son alcanzables sin rutina todavía |
| Copy | Texto nuevo, registro de instrucción ("Tocando acá podés…"), no reusa la copy de venta de la landing |
| Interrupción por acción real | Cualquier click real en una tarjeta cierra el tour solo (ya queda marcado como visto desde que arrancó, así que no hace falta lógica extra acá) |
| Botón de saltar | Sí, visible desde el paso 1 |
| Overlay vs. liviano | Overlay con spotlight (oscurece todo menos la tarjeta actual) — es lo que describe el roadmap textualmente |
| ¿Animación? | No — 100% estático, mismo criterio que la Etapa 14 (Landing↔Login sin transición, a propósito). **Matiz real encontrado en la librería** (ver "Nota de precisión" abajo): no es post 100% alcanzable con `react-joyride` sin tocar su fuente |
| Librería vs. hecho a mano | `react-joyride` (decisión del usuario, contra la recomendación inicial de hacerlo a mano) — peer deps compatibles con React 19 (`"react": "16.8 - 19"`, confirmado contra el `package.json` publicado), agrega ~720kb sin comprimir entre la librería y sus dependencias transitivas (`@floating-ui/react-dom`, `scroll`, etc.) |
| Cierre del tooltip | Ambos: X en la esquina + botón "Saltar" abajo |
| ¿Tabla `profiles` nueva o columna en tabla existente? | Tabla `profiles` nueva — primer dato de cuenta que no es rutina/progreso/historial, le da un hogar propio a esto y a futuros flags de usuario |
| Conflicto real: "Ver tutorial" en `SideMenu` | `SideMenu.jsx` solo se renderiza cuando ya existe una rutina (mismo candado que tenía `ConnectMcp` antes de la Etapa 13) — en ese momento las tarjetas del tour ya no están en pantalla. Se resuelve sacándolo de `SideMenu` y poniéndolo directo en `FileUpload.jsx`, donde las tarjetas sí existen |

## Nota de precisión: "100% estático" con `react-joyride`

Se decidió sin animación, mismo criterio que la Etapa 14. Investigando
el código fuente publicado de `react-joyride`/`react-floater` (no
asumido de memoria):

- El fade del tooltip (`styles.floater.transition: 'opacity 0.3s'`) **sí
  se puede desactivar** — se sobreescribe pasando `transition: 'none'`
  en el prop `styles.floater` de `<Joyride>` (se mergea con
  `deepmerge` sobre los defaults, confirmado leyendo
  `react-floater/src/modules/styles.ts` y `react-joyride/src/styles.ts`).
- **Lo que no se puede desactivar por prop:** el `Overlay.tsx` interno
  de Joyride tiene un `transition: 'opacity 0.2s'` **hardcodeado en JSX
  inline** (no pasa por el objeto `styles` mergeable) sobre el
  "recorte" que revela el spotlight. Es un detalle de implementación de
  la librería, no expuesto como prop.
- **Decisión:** se acepta esta única excepción de 0.2s (el recorte del
  spotlight revelándose) como parte del costo de usar la librería en
  vez de hacerlo a mano — es interna a cómo Joyride dibuja el agujero
  del spotlight, no un patrón de animación que este proyecto esté
  introduciendo a propósito. Todo lo demás (fade del tooltip, botones,
  transiciones del propio contenido) sí queda desactivado explícitamente.

## Nota de precisión: el beacon del paso 1

`continuous` **no** alcanza para que el tour arranque mostrando el
tooltip. Leyendo el fuente de `react-joyride@3.2.0`
(`src/modules/step.ts`):

```ts
export function shouldHideBeacon(step, state, continuous) {
  const { action } = state;
  const withContinuous = continuous && [ACTIONS.PREV, ACTIONS.NEXT].includes(action);
  return step.skipBeacon || step.placement === 'center' || withContinuous;
}
```

En el primer render la acción del estado es `START`, no `NEXT`, así que
`withContinuous` da `false` y el beacon **sí** se renderiza. Del paso 2
en adelante la acción ya es `NEXT` y el beacon se oculta solo. De ahí el
síntoma: el paso 1 pide un click en un puntito y los pasos 2 y 3 abren
directo.

- **La propiedad es `skipBeacon`, no `disableBeacon`.** `disableBeacon`
  era la API de la v2; en la 3.2.0 no existe y se ignora en silencio
  (verificado: no aparece en `src/` ni en `dist/` del paquete).
- **Va solo en el primer step.** Los otros dos ya lo resuelven por
  `continuous`. Ponerlo en los tres es inofensivo pero redundante.
- **No usar `placement: 'center'`** como atajo para saltear el beacon:
  también lo saltea, pero centra el tooltip en la pantalla y pierde el
  anclaje a la tarjeta.

## Fuera de alcance (pospuesto)

- **Cualquier otro tour** (ej. sobre Stats o Open Tracker) — solo el
  empty state, ver tabla arriba.
- **Analytics de completitud del tour** (cuánta gente lo completa vs.
  lo saltea) — el proyecto no tiene ningún stack de analytics hoy, no
  se agrega uno solo para esto.
- **Traducción/i18n** — la app entera está en español fijo, sin
  excepción acá.

## Tabla nueva: `profiles`

```sql
create table profiles (
  user_id uuid primary key references auth.users not null,
  welcome_tour_seen_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "own profile" on profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Backfill (una sola vez, al desplegar esta etapa):** marcar como ya
visto a todas las cuentas que ya existen hoy, para que "solo cuentas
nuevas de acá en adelante" sea real:

```sql
insert into profiles (user_id, welcome_tour_seen_at)
select id, now() from auth.users
on conflict (user_id) do nothing;
```

Corrida manual, una vez, desde el SQL editor de Supabase — mismo
criterio que las migraciones anteriores del proyecto (`etapa-8`/`etapa-9-analisis.md`
documentan sus `create table` pero no automatizan la corrida).

## `src/utils/profile.js` (nuevo)

Mismo patrón que `getOrCreateApiKey` en `apiKeys.js` — no se reinventa
un estilo nuevo para esto:

```js
export async function hasSeenWelcomeTour(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('welcome_tour_seen_at')
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data?.welcome_tour_seen_at)
}

export async function markWelcomeTourSeen(userId) {
  await supabase
    .from('profiles')
    .upsert({ user_id: userId, welcome_tour_seen_at: new Date().toISOString() })
}
```

`upsert` porque una cuenta nueva todavía no tiene fila en `profiles`
(el backfill solo cubre a las que ya existían al momento del deploy).

## Componente nuevo: `WelcomeTour.jsx`

```
src/components/WelcomeTour.jsx
```

- Recibe `userId` y `run` (booleano — si mostrarlo ahora mismo).
- Al montar con `run === true` y no haberlo hecho ya en esta sesión,
  llama `markWelcomeTourSeen(userId)` inmediatamente (ver "tour
  interrumpido" en la tabla — se marca al arrancar, no al terminar).
- `steps`: array de 3, `target` apuntando a los `id` nuevos de cada
  tarjeta en `FileUpload.jsx` (`#upload-option-excel`,
  `#upload-option-template`, `#upload-option-ai`), `content` con el
  copy nuevo (registro de instrucción, ver tabla).
- El **primer** step lleva además `skipBeacon: true`, para que el tour
  arranque mostrando el tooltip con el spotlight sobre la tarjeta de
  Excel en vez del beacon (ver nota de precisión arriba).
- `<Joyride>` con `showSkipButton`, `continuous`, `styles` mapeando a
  las variables de `index.css` (`overlayColor` con `--bg` semitransparente,
  tooltip `backgroundColor: 'var(--bg-card)'`, texto `'var(--text)'`,
  botón primario `'var(--accent)'`/`'var(--accent-contrast)'`) y
  `styles.floater.transition: 'none'` (ver nota de precisión arriba).
- `callback`: en cualquier evento de tipo `EVENT.STEP_AFTER` con acción
  `close`/`skip`, o si Joyride reporta `status: FINISHED`/`SKIPPED`,
  simplemente deja de renderizar (el flag en Supabase ya se escribió al
  arrancar, no hay nada más que hacer acá).

## `FileUpload.jsx`: ids nuevos + link de repetición

- Se agrega `id="upload-option-excel"` / `id="upload-option-template"` /
  `id="upload-option-ai"` a los tres `<div className="upload-option">`
  existentes — único cambio a la estructura actual.
- Nuevo `useState` local `showTourAgain` (arranca en `false`). Un link
  chico al pie de la pantalla, "Ver tutorial de nuevo", lo pone en
  `true` — el `run` que recibe `WelcomeTour` es
  `isFirstRun || showTourAgain`.
- `isFirstRun` sale de un `useEffect` que llama `hasSeenWelcomeTour(user.id)`
  al montar (mismo patrón que cualquier otro pull de Supabase en el
  proyecto — fire-and-forget, sin bloquear el render de las tarjetas
  mientras se resuelve).

## Checklist de implementación

- [ ] Migración SQL: tabla `profiles` + RLS + backfill (correr a mano en
      Supabase, documentado arriba).
- [ ] `npm install react-joyride`.
- [ ] `src/utils/profile.js` — `hasSeenWelcomeTour`/`markWelcomeTourSeen`.
- [ ] `WelcomeTour.jsx` — steps (con `skipBeacon: true` en el primero),
      estilos mapeados a `index.css`,
      `styles.floater.transition: 'none'`.
- [ ] `FileUpload.jsx` — ids en las 3 tarjetas, `useEffect` de
      `hasSeenWelcomeTour`, link "Ver tutorial de nuevo", montar
      `<WelcomeTour>`.
- [ ] Confirmar visualmente que el paso 1 abre directo en el tooltip con
      el spotlight sobre la tarjeta de Excel, sin beacon intermedio.
- [ ] Confirmar visualmente en el browser: el tour aparece para una
      cuenta nueva sin fila en `profiles`, no aparece para una cuenta ya
      marcada como vista, "Saltar"/X lo cierran, tocar una tarjeta real
      lo cierra, "Ver tutorial de nuevo" lo vuelve a mostrar sin tocar
      el flag de Supabase, y se ve bien en mobile (tarjetas apiladas) y
      desktop (tarjetas en fila) — confirmar que Joyride hace scroll
      solo hasta cada tarjeta si hace falta.
