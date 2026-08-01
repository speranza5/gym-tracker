# Etapa 10 — Sección de estadísticas

> Análisis funcional previo a implementar. Depende por completo de la
> [Etapa 9](./etapa-9-analisis.md) (sin sesiones registradas no hay datos
> que mostrar). Ver también: [`roadmap.md`](./roadmap.md) ·
> [`decisions.md`](./decisions.md)

## Objetivo

Que el usuario vea, por semana/mes/año, cuántos días entrenó y qué
ejercicios entrena con más frecuencia — la primera pantalla de la app que
**lee** datos históricos en vez de solo capturarlos.

## Decisiones ya tomadas

| Pregunta | Decisión |
|---|---|
| Fuente de "días completados" | Tabla `history` existente (ya es 1 fila por día al 100%, sin ambigüedad de sesiones parciales/múltiples) |
| Denominador "planificado" | Ninguno todavía — se muestra el conteo/racha de días completados, sin ratio contra un plan (no existe concepto de calendario semanal en el dominio hoy) |
| Fuente de "ejercicios más frecuentes" | Tabla `training_sessions` (Etapa 9), contando solo filas donde `checked: true` para ese ejercicio |
| Límites de período | Alineados a calendario: semana lunes–domingo, mes 1º–fin de mes, año ene–dic |
| Navegación entre períodos | Sí — flechas prev/next para semanas/meses/años anteriores |
| Cantidad de ejercicios en el ranking | Top 5 |
| Estado vacío | Mensaje simple ("Todavía no registraste sesiones este período"), sin gráfico ni ceros |

## Fuera de alcance (pospuesto)

- Cualquier concepto de "plan semanal" (cuántos días *debería* entrenar el
  usuario) — necesitaría una feature nueva de definir un calendario, no
  solo leer datos ya guardados.
- Progresión de cargas / gráficos de peso en el tiempo (Etapa 11).
- Comparar un período contra otro (ej. "este mes vs. el anterior") más
  allá de navegar entre ellos uno a la vez.

## Fuentes de datos y rango de fechas

Dos queries nuevas, ambas filtradas por rango (a diferencia de
`pullCloudState`, que hoy trae `history` completo sin filtro):

```js
// cloudSync.js — nuevas, no reemplazan a pullCloudState
export async function pullHistoryInRange(userId, startDate, endDate) {
  // history.date es texto 'YYYY-MM-DD' → comparable lexicográficamente
  return supabase.from('history')
    .select('date, day_id, day_name')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
}

export async function pullSessionsInRange(userId, startDate, endDate) {
  return supabase.from('training_sessions')
    .select('date, exercises')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
}
```

- **Días completados** = cantidad de filas de `history` en el rango
  (cada una ya es un día distinto por el `unique(user_id, date, day_id)`
  existente — pero un mismo día puede tener 2 filas si hay 2 "días" de
  rutina completados esa fecha; para el conteo de "días" en el sentido de
  fechas de calendario, se cuentan fechas **distintas**, no filas).
  **Asunción a confirmar.**
- **Ejercicios más frecuentes** = agrupar todas las filas de
  `training_sessions` del rango, aplanar sus `exercises`, filtrar
  `checked === true`, contar por `exerciseName`, ordenar desc, cortar en
  Top 5.

## Cálculo de límites de período

Todo en el cliente, mismo criterio que `todayStr()` (hora local del
dispositivo, no UTC):

- **Semana:** lunes a domingo que contiene la fecha de referencia.
- **Mes:** día 1 al último día del mes de la fecha de referencia.
- **Año:** 1 de enero al 31 de diciembre.
- **Navegación:** un estado `{ granularity: 'week'|'month'|'year', offset:
  number }`, donde `offset: 0` es el período actual y cada paso de
  "anterior" resta 1 (una semana/mes/año según `granularity`). El botón
  "siguiente" se deshabilita en `offset: 0` (no se navega al futuro).
  **Cambiar de `granularity` reinicia `offset` a `0`** — no se mantiene la
  posición relativa al cambiar de vista semana→mes.

## Cambios de UI

- **Pantalla nueva** (`StatsView.jsx` o similar), un `screen` adicional en
  `App.jsx` (mismo patrón que `'open-tracker'`).
- **Entrada al menú:** nuevo ítem en `SideMenu.jsx`, gateado igual que
  Open Tracker (`{user && (...)}`) — **toda** la pantalla requiere login,
  no solo partes de ella, porque depende enteramente de
  `training_sessions` (Etapa 9, ya login-gated). Ver `history` sí existe
  para invitados hoy, pero no alcanza para esta pantalla por sí sola.
  **Asunción a confirmar** (consistente con el patrón ya establecido en
  Etapas 8/9, no un caso nuevo).
- **Selector de período:** tabs tipo `ViewToggle.jsx` (semana/mes/año) +
  flechas prev/next a los costados de un label central (ej. "Marzo 2026",
  "Semana del 9 al 15").
- **Dos secciones dentro de la pantalla:**
  1. Consistencia: conteo de días completados en el período (ej. "14 días
     entrenados en marzo"), fuente `history`.
  2. Ejercicios más frecuentes: lista Top 5 con su conteo, fuente
     `training_sessions`.
- **Estado vacío:** si ambas fuentes no traen filas para el período,
  reemplazar las dos secciones por un mensaje único, no dos mensajes
  vacíos separados.

## Edge cases

- **Semana/mes que cruza el cambio de año** (ej. semana del 29/12 al
  4/1): el cálculo de límites de semana debe funcionar cruzando años sin
  casos especiales — es aritmética de fechas estándar, no debería
  necesitar lógica extra si se usa `Date` nativo en vez de manipular
  strings a mano.
- **Ejercicio renombrado entre subidas de Excel:** igual que en la Etapa
  8, el ranking se basa en `exerciseName` tal como quedó guardado en cada
  `training_sessions.exercises` en su momento — si el usuario renombra un
  ejercicio, sus entradas viejas y nuevas cuentan como ejercicios
  distintos en el ranking. Mismo comportamiento aceptado que en la Etapa 8
  (no hay fuzzy matching).
- **Timezone:** todo el cálculo de "hoy"/límites de período usa la hora
  local del dispositivo, igual que el resto de la app (`todayStr()`) — si
  el usuario cambia de zona horaria (viaje), los límites de período se
  recalculan según el dispositivo en ese momento, no hay normalización a
  UTC en ningún lado del proyecto hoy.

## Checklist de implementación

- [ ] `pullHistoryInRange` y `pullSessionsInRange` en `cloudSync.js`.
- [ ] Utilidad de cálculo de límites de período (semana/mes/año +
      offset), pura, testeable sin red.
- [ ] Utilidad de agregación: `history` → conteo de días distintos;
      `training_sessions.exercises` → ranking Top 5 por `exerciseName`.
- [ ] Componente `StatsView.jsx` con selector de período (tabs +
      prev/next) y las dos secciones.
- [ ] Ítem nuevo en `SideMenu.jsx`, gateado por `{user && (...)}`.
- [ ] Wiring del `screen` nuevo en `App.jsx` (mismo patrón que
      `'open-tracker'`).
- [ ] Estado vacío unificado cuando no hay datos en el período.
