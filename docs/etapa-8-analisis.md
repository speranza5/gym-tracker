# Etapa 8 — Registro de peso por ejercicio (benchmark)

> Análisis funcional previo a implementar. Ver también:
> [`roadmap.md`](./roadmap.md) · [`decisions.md`](./decisions.md) ·
> [`domain/routine.js`](../src/domain/routine.js)

## Objetivo

Que el usuario pueda anotar qué peso usó en un ejercicio, y ver ese mismo
valor la próxima vez que lo entrene — un benchmark simple, no todavía un
historial (eso es la [Etapa 9](./roadmap.md)).

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| Granularidad | Un solo valor de peso por ejercicio (no por serie) |
| Identidad entre re-uploads de Excel | Se matchea por **nombre** del ejercicio, no por `id` |
| Dónde se captura | Tanto en modo lista (`ExerciseCard.jsx`) como en modo foco (`FocusCard.jsx`) |
| Obligatoriedad | Siempre opcional (ejercicios sin carga externa, ej. plancha) |
| Unidad | Solo kg, sin selector |
| Modo invitado | **Requiere login** — primera feature de la app gateada así, antes de la Etapa 12 |
| Guardado | Solo se persiste junto con marcar el ejercicio como hecho (acción combinada, no autosave al tipear) |

## Fuera de alcance (pospuesto a otras etapas)

- Selector de unidad kg/lb.
- Historial de sesiones completas (Etapa 9).
- Cualquier vista de progresión o estadística (Etapas 10/11) — esta etapa
  solo guarda el *último* valor, no una serie temporal.
- Registrar series/reps reales hechas (solo el Excel define eso hoy, como
  texto libre).

## Modelo de datos

Tabla nueva en Supabase, con el mismo patrón que `routines`/`progress`/
`history` (`src/utils/cloudSync.js`): RLS `auth.uid() = user_id`, upsert
fire-and-forget.

```sql
create table exercise_benchmarks (
  user_id uuid references auth.users not null,
  exercise_name text not null,        -- normalizado, ver abajo
  weight_kg numeric not null,
  updated_at timestamptz default now(),
  primary key (user_id, exercise_name)
);
```

**Normalización del nombre:** dado que el matching es por nombre (no por
`id`), hace falta una función pura nueva en `src/domain/routine.js` (mismo
lugar que ya centraliza "qué es una rutina válida"), ej.
`normalizeExerciseName(name)` → `trim().toLowerCase()`. Sin esto, "Press
Banca" y "press banca " serían dos benchmarks distintos. **Asunción a
confirmar:** no se contempla fuzzy matching (typos, singular/plural) — un
nombre distinto en un Excel nuevo simplemente empieza su propio benchmark
desde cero.

## Cambios de UI

- **`ExerciseCard.jsx`** y **`FocusCard.jsx`**: nuevo input numérico de
  peso (kg), opcional.
- **Precarga:** el input arranca con el último `weight_kg` guardado para
  ese nombre de ejercicio (si existe), editable — no un placeholder de
  solo lectura. Así "repetir el mismo peso" es no tocar el campo.
  **Asunción a confirmar.**
- **Guardado combinado con "hecho":** tipear un peso no lo persiste por sí
  solo; se guarda en el mismo momento en que se marca el ejercicio como
  completado (`toggleExercise` en `useProgress.js`). Si el usuario
  destilda el ejercicio después, el benchmark ya guardado **no se
  borra** — sigue siendo el último valor conocido hasta que se vuelva a
  marcar como hecho con un peso distinto. **Asunción a confirmar.**
- **Modo invitado:** el campo de peso no se muestra en absoluto sin sesión
  (mismo patrón que `{user && (...)}` en `SideMenu.jsx:65` para el ítem de
  Open Tracker) — no un campo deshabilitado con un cartel, directamente
  ausente.

## Sync

Nuevas funciones en `cloudSync.js`, mismo patrón fire-and-forget que
`pushProgress`/`pushHistory`:

- `pullBenchmarks(userId)` → se suma a `pullCloudState` (hoy trae
  `routine`/`progress`/`history`; sumaría `benchmarks`).
- `pushBenchmark(userId, exerciseName, weightKg)` → upsert de una sola
  fila (no de la tabla completa, a diferencia de `pushHistory` que sube
  todo el array).

No hay concepto de "modo invitado con migración al loguearse" acá (a
diferencia de rutina/progreso/historial) porque la feature entera requiere
sesión — no hay estado local previo que migrar.

## Nota para `decisions.md`

Esta etapa introduce la primera funcionalidad de la app que **requiere**
login, mientras que la Etapa 2 sigue vigente como decisión general ("login
opcional, no obligatorio"). Vale la pena una entrada nueva en
`decisions.md` documentando esto como una excepción puntual y por qué (en
vez de que alguien lea la ADR #1 más adelante y lo lea como una
contradicción sin explicar). Se puede escribir junto con el código, no
hace falta antes.

## Checklist de implementación

- [ ] Migración SQL: tabla `exercise_benchmarks` + política RLS.
- [ ] `normalizeExerciseName` en `src/domain/routine.js`.
- [ ] `pullBenchmarks`/`pushBenchmark` en `src/utils/cloudSync.js`.
- [ ] Nuevo hook o extensión de `useProgress.js` para exponer
      `benchmarks`/`setBenchmark`.
- [ ] Input de peso en `ExerciseCard.jsx` (modo lista).
- [ ] Input de peso en `FocusCard.jsx` (modo foco).
- [ ] Ocultar el input completo si `!user`.
- [ ] ADR nueva en `decisions.md` sobre el login obligatorio puntual.
