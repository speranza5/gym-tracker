# Etapa 9 — Registro de sesión de entrenamiento

> Análisis funcional previo a implementar. Depende de la
> [Etapa 8](./etapa-8-analisis.md) (pesos por ejercicio). Ver también:
> [`roadmap.md`](./roadmap.md) · [`decisions.md`](./decisions.md)

## Objetivo

Que el usuario pueda guardar una "foto" real de lo que entrenó (qué
ejercicios, con qué peso, cuándo) — el registro real de una sesión, a
diferencia de `history`, que hoy solo marca que un día llegó al 100% (sin
detalle de qué se hizo).

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| Trigger en modo foco | Botón nuevo en la pantalla "¡Día completado!" (`FocusView.jsx`), junto a "Volver a la lista" |
| Trigger en modo lista | Botón siempre visible (no gateado al 100%) en `ProgressBar.jsx`, junto a "Reiniciar día" |
| Registro parcial (modo lista, no llegó al 100%) | Se guarda exactamente lo que está marcado en ese momento — snapshot honesto, no forzado a completar |
| Relación con `history` | Tabla nueva (`training_sessions`), `history` queda intacta con su rol actual de marcador de racha |
| Múltiples sesiones el mismo día | Permitido — cada tap de "Registrar sesión" inserta una fila nueva, sin upsert ni constraint de unicidad |
| Requiere login | Sí — mismo gate que la Etapa 8 (sin sesión, sin pesos, un registro sería una versión vacía de la feature) |
| Contenido del registro | Fecha, día, ejercicios hechos + peso por ejercicio + nota de texto libre opcional |
| Estado del botón tras registrar | Se mantiene disponible — volver a tocarlo agrega otra fila, sin deshabilitar ni ocultar |
| Notas al registrar | Modal con textarea opcional, se abre en cada tap de "Registrar sesión" |
| Cerrar el modal por la X o por afuera | **Cancela de verdad** — no registra nada (cambiado tras probar la primera versión: ver nota abajo) |
| Cerrar el modal con "Guardar" | Único camino que registra la sesión, con la nota tipeada (o sin ella si quedó vacía) |
| Feedback de confirmación | Toast custom (sin librería nueva), se muestra después de cerrar el modal |
| Editar una nota ya guardada | Fuera de alcance — Etapa 9 sigue siendo de solo-escritura |

## Fuera de alcance (pospuesto)

- Duración de sesión (no hay timestamps de inicio/fin en ningún lado hoy).
- Editar o borrar un registro ya guardado (incluida su nota).
- Cualquier vista que lea `training_sessions` (eso es la
  [Etapa 10](./roadmap.md)) — esta etapa solo escribe datos, no los
  muestra todavía.

## Modelo de datos

```sql
create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date text not null,              -- 'YYYY-MM-DD', igual formato que progress.date/history.date
  recorded_at timestamptz default now(),  -- momento exacto, para poder ordenar 2 sesiones del mismo día
  day_id text not null,
  day_name text not null,
  exercises jsonb not null,        -- [{ exerciseId, exerciseName, checked, weightKg }]
  notes text,                      -- nullable: el usuario puede cerrar el modal sin escribir nada
  created_at timestamptz default now()
);

alter table training_sessions enable row level security;
create policy "own training_sessions" on training_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Sin `unique` constraint (a diferencia de `history`) — múltiples filas por
`user_id + date + day_id` son válidas por diseño.

**`exercises` (jsonb):** un array con **todos** los ejercicios del día en
ese momento (no solo los marcados), cada uno con:
- `exerciseId`, `exerciseName`: para poder mostrar el registro después sin
  depender de que la rutina no haya cambiado.
- `checked`: boolean, tal como está en `progress.checked` al momento de
  registrar.
- `weightKg`: el valor actual en `exercise_benchmarks` (Etapa 8) para ese
  nombre de ejercicio si existe, si no `null` (ejercicio sin peso cargado
  o de tipo bodyweight). **No** se limita a "solo lo tocado hoy": si el
  usuario cargó un peso hace 3 días y no lo volvió a tocar, ese sigue
  siendo su peso vigente y aparece en el snapshot. **Asunción a
  confirmar.**

## Cambios de UI

- **`ProgressBar.jsx`**: nuevo botón "Registrar sesión" en el footer,
  junto al de "Reiniciar día" — visible siempre que haya sesión, sin
  condición de porcentaje.
- **`FocusView.jsx`**: nuevo botón en el bloque `focus-view__complete`
  (pantalla "¡Día completado!"), junto a "Volver a la lista".
- Ambos botones abren el **mismo** componente de modal (ver abajo) — no
  hay lógica de registro duplicada entre modo lista y modo foco, solo dos
  puntos de entrada distintos al mismo flujo.
- **Modo invitado:** igual que en la Etapa 8, ningún botón se muestra en
  absoluto sin sesión (no deshabilitado, ausente).

## Modal de notas

Componente nuevo, ej. `RecordSessionModal.jsx`, invocado desde ambos
puntos de entrada:

1. El usuario toca "Registrar sesión" → se abre el modal con un
   `<textarea>` opcional ("¿Cómo te sentiste? (opcional)") y un botón
   "Guardar".
2. **"Guardar"** (con o sin texto en el textarea) es el único camino que
   registra: llama a `pushSession` (ver Sync) con `notes: null` si quedó
   vacío, cierra el modal, y dispara el toast de confirmación.
3. **X o click afuera del modal** cancelan de verdad — no llaman a
   `pushSession`, solo cierran el modal y descartan lo tipeado.

> **Nota (post-implementación):** la primera versión de esta etapa hacía
> que cualquier cierre registrara la sesión (X y click afuera incluidos),
> con el razonamiento de que "cerrar el modal" no debería poder perder el
> registro de una sesión ya completada. En el uso real esto resultó
> confuso — la X se lee como "cancelar", no como "guardar sin nota" — así
> que se cambió a que solo "Guardar" registre. Si se vuelve a tocar este
> flujo, mantener esta versión: es la que el usuario probó y confirmó.

No hay validación de longitud ni contenido — es texto libre, tal cual lo
tipee el usuario.

## Toast de confirmación

Sin agregar ninguna librería nueva (mismo criterio que
`decisions.md` #4/#12: no sumar una dependencia para un caso de uso
puntual). Un componente propio y mínimo:

- Estado simple (ej. `useState` en `App.jsx` o un hook `useToast()`
  liviano) con un mensaje y un timeout (`setTimeout` + `clearTimeout` en
  cleanup) que lo oculta solo a los pocos segundos.
- Un solo mensaje para esta etapa: "Sesión registrada". No hace falta que
  el mecanismo soporte variantes (error/success) todavía — se puede
  extender después si hace falta.
- Vive a nivel `App.jsx` (no duplicado en `ProgressBar.jsx` y
  `FocusView.jsx` por separado), porque ambos triggers terminan en el
  mismo `pushSession` y deberían disparar el mismo toast compartido.

## Sync

Nueva función en `cloudSync.js`, pero a diferencia de todo lo existente
(que es upsert de un estado único), acá es **insert puro**:

```js
export async function pushSession(userId, session) {
  try {
    await supabase.from('training_sessions').insert({
      user_id: userId,
      date: session.date,
      day_id: session.dayId,
      day_name: session.dayName,
      exercises: session.exercises,
      notes: session.notes || null,
    })
  } catch {
    // mismo patrón fire-and-forget que el resto de cloudSync.js
  }
}
```

No hace falta `pull` en el arranque de la app (a diferencia de
rutina/progreso/historial) — nadie necesita "cargar" sesiones pasadas
todavía; eso empieza a importar recién en la Etapa 10.

## Relación con `history`

Quedan **dos tablas con propósitos distintos y superpuestos a propósito**:
- `history`: marcador liviano de racha (día llegó al 100%, sin detalle).
- `training_sessions`: registro real de qué se entrenó, de forma explícita
  (el usuario elige registrar, no es automático).

Un día puede aparecer en `history` sin tener ninguna fila en
`training_sessions` (si el usuario nunca tocó "Registrar sesión") y
viceversa (sesión registrada al 60%, sin llegar nunca al 100% que dispara
`history`). Es una duplicación conocida y aceptada — documentar como ADR
nueva en `decisions.md`, mismo criterio que la ADR #9 (duplicación
aceptada y documentada, no accidental).

## Checklist de implementación

- [ ] Migración SQL: tabla `training_sessions` (con `notes`) + RLS.
- [ ] `pushSession` en `src/utils/cloudSync.js` (incluye `notes`).
- [ ] Wiring en `useProgress.js` (o hook nuevo) para armar el snapshot de
      `exercises` a partir de `workoutData` + `progress.checked` +
      `benchmarks` (Etapa 8) y llamar a `pushSession`.
- [ ] Componente `RecordSessionModal.jsx` (textarea opcional + "Guardar").
- [ ] Hook/estado de toast (`useToast()` o similar) montado en `App.jsx`.
- [ ] Botón "Registrar sesión" en `ProgressBar.jsx` → abre el modal.
- [ ] Botón "Registrar sesión" en la pantalla de completado de
      `FocusView.jsx` → abre el mismo modal.
- [ ] Ocultar ambos botones si `!user`.
- [ ] ADR nueva en `decisions.md`: duplicación intencional entre `history`
      y `training_sessions`.
