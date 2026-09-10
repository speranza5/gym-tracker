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
| Contenido de la landing | Hero (ícono + título + subtítulo) + lista de features + un único CTA ("Continuar con Google") |
| Estilo del CTA | Botón grande, relleno con `--accent` (mismo peso visual que `.modal__save`), no el botón chico `.auth-button--signin` que hoy vive en una esquina |
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

## Contenido de la landing

**Asunción a confirmar** (copy concreto, fácil de ajustar sin tocar
estructura):

- **Ícono + título:** `Dumbbell` (ya usado en el header de la app) + "Gym
  Tracker".
- **Subtítulo:** "Llevá tu rutina de gimnasio desde una planilla Excel,
  con checklist diaria, estadísticas y sincronización en la nube — o
  dejá que un asistente de IA la actualice por vos."
- **Features (4, ícono + una línea cada una):**
  1. `FileSpreadsheet` — "Subí tu rutina en Excel y marcala como una
     checklist diaria."
  2. `RefreshCw` — "Sincronizá tu progreso entre dispositivos."
  3. `LineChart` — "Mirá tu consistencia y la progresión de cargas por
     ejercicio."
  4. `Bot` — "Conectá Claude o ChatGPT vía Open Tracker (MCP) para
     gestionar tu rutina por chat."
- **CTA único:** "Continuar con Google" (`LogIn`, mismo ícono que
  `AuthButton` ya usa).

## Componente nuevo: `Landing.jsx`

```
src/components/Landing.jsx
```

- Recibe `onSignIn` (de `useAuth().signInWithGoogle`, ya existe) — nada
  más, no necesita `user` (por definición, si se está renderizando,
  `user` es `null`).
- Reusa las variables de `src/index.css`, ningún color nuevo.
- Estructura: contenedor centrado tipo `.upload-screen` (mismo patrón de
  layout, clases propias `.landing`/`.landing__*` porque el contenido es
  distinto — hero + lista, no un dropzone).
- CTA nuevo en CSS: `.landing__cta` — fondo `--accent`, texto
  `--accent-contrast`, mismo peso que `.modal__save` (`min-height: 52px`,
  `font-weight: 700`), no el estilo chico de `.auth-button--signin`.

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

- [ ] `Landing.jsx` + CSS (`.landing`, `.landing__*`, `.landing__cta`).
- [ ] Gate nuevo en `App.jsx`: `authLoading` → loading mínimo; `!user` →
      `Landing`; el resto sigue igual.
- [ ] Sacar `authLoading`/`onSignIn` de las props de `FileUpload.jsx` y
      `SideMenu.jsx`.
- [ ] Sacar la rama `!user` de `AuthButton.jsx` (queda sin caller tras el
      punto anterior).
- [ ] Actualizar `README.md` (`## Objetivo`, punto 1).
- [ ] Confirmar visualmente en el browser: landing se ve bien en mobile
      (~400px), CTA funciona (redirige a Google), no hay parpadeo
      landing→app para una sesión ya activa al recargar.
