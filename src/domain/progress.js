import { z } from 'zod'

/**
 * Agregaciones de progreso, compartidas por la pantalla de estadísticas
 * (navegador) y la API REST (Netlify Functions). Funciones puras: sin red,
 * sin React, sin Supabase — operan sobre filas ya leídas, sin saber de
 * dónde vinieron (frontend vía RLS o API vía service role).
 *
 * Los schemas de Zod de acá abajo definen los DTOs de respuesta de
 * `/progress/summary` y `/progress/exercises/{nombre}`: los usa
 * `netlify/functions/_lib/openapiSpec.js` para generar el spec de OpenAPI.
 * (Mismo rol que `src/domain/routine.js` para la rutina.)
 */

export const ProgressSummarySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  completedDays: z.number().int().nonnegative(),
  sessionsRecorded: z.number().int().nonnegative(),
  lastSessionAt: z.string().nullable(),
  topExercises: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative() })),
  exercisesTracked: z.number().int().nonnegative(),
})

export const ExerciseProgressSchema = z.object({
  exerciseName: z.string(),
  range: z.object({ from: z.string(), to: z.string() }),
  currentBenchmarkKg: z.number().nullable(),
  sessionCount: z.number().int().nonnegative(),
  points: z.array(z.object({ recordedAt: z.string(), weightKg: z.number() })),
})

/**
 * Cuenta fechas distintas, no filas — un mismo día puede tener 2 filas
 * en `history` si hay 2 "días" de rutina completados esa fecha (ver
 * docs/etapa-10-analisis.md).
 * @param {{date: string}[]} historyRows
 */
export function countDistinctDays(historyRows) {
  return new Set(historyRows.map((row) => row.date)).size
}

/**
 * Ranking de ejercicios más frecuentes por nombre, contando solo
 * entradas marcadas como hechas (`checked: true`) en las sesiones del
 * rango.
 * @param {{exercises: {exerciseName: string, checked: boolean}[]}[]} sessionRows
 * @param {number} limit
 * @returns {{name: string, count: number}[]}
 */
export function topExercises(sessionRows, limit = 5) {
  const counts = new Map()
  sessionRows.forEach((session) => {
    ;(session.exercises || []).forEach((exercise) => {
      if (!exercise.checked) return
      const name = exercise.exerciseName
      counts.set(name, (counts.get(name) || 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Deriva, de todas las `training_sessions` de un usuario (Etapa 11), la
 * lista de nombres de ejercicio distintos y la serie temporal de peso por
 * ejercicio. Pesos nulos (ejercicio marcado sin peso) se excluyen — no se
 * grafican como 0. Cada sesión es su propio punto, aunque haya varias el
 * mismo día (ver docs/etapa-11-analisis.md).
 * @param {{recorded_at: string, exercises: {exerciseName: string, weightKg: number|null}[]}[]} sessionRows
 * @returns {{ exerciseNames: string[], seriesByExercise: Map<string, {recordedAt: string, weightKg: number}[]> }}
 */
export function buildExerciseProgress(sessionRows) {
  const seriesByExercise = new Map()

  sessionRows.forEach((session) => {
    ;(session.exercises || []).forEach((exercise) => {
      if (exercise.weightKg == null) return
      const name = exercise.exerciseName
      if (!seriesByExercise.has(name)) seriesByExercise.set(name, [])
      seriesByExercise.get(name).push({
        recordedAt: session.recorded_at,
        weightKg: Number(exercise.weightKg),
      })
    })
  })

  const exerciseNames = Array.from(seriesByExercise.keys()).sort((a, b) => a.localeCompare(b))

  return { exerciseNames, seriesByExercise }
}

/**
 * Resumen de progreso de un usuario en un rango. Puro: recibe las filas
 * ya leídas, no sabe de dónde vinieron.
 * @param {{historyRows: {date: string}[], sessionRows: {recorded_at: string, exercises: {exerciseName: string, checked: boolean, weightKg: number|null}[]}[], from: string, to: string}} params
 */
export function summarizeProgress({ historyRows, sessionRows, from, to }) {
  const recordedAts = sessionRows.map((s) => s.recorded_at).filter(Boolean).sort()
  return {
    range: { from, to },
    completedDays: countDistinctDays(historyRows),
    sessionsRecorded: sessionRows.length,
    lastSessionAt: recordedAts.length > 0 ? recordedAts[recordedAts.length - 1] : null,
    topExercises: topExercises(sessionRows, 5),
    exercisesTracked: buildExerciseProgress(sessionRows).exerciseNames.length,
  }
}

/**
 * Serie temporal de peso de UN ejercicio, más su benchmark actual.
 * Devuelve null si no hay ningún punto en el rango — quien llama decide
 * si eso es un 404 (la API) o un empty state (el frontend).
 * @param {{sessionRows: {recorded_at: string, exercises: {exerciseName: string, weightKg: number|null}[]}[], benchmarkRow: {weight_kg: number|null} | null, exerciseName: string, from: string, to: string}} params
 */
export function buildExerciseSeries({ sessionRows, benchmarkRow, exerciseName, from, to }) {
  const { seriesByExercise } = buildExerciseProgress(sessionRows)
  const points = (seriesByExercise.get(exerciseName) || []).sort((a, b) =>
    a.recordedAt < b.recordedAt ? -1 : 1
  )
  if (points.length === 0) return null

  return {
    exerciseName,
    range: { from, to },
    currentBenchmarkKg: benchmarkRow?.weight_kg != null ? Number(benchmarkRow.weight_kg) : null,
    sessionCount: points.length,
    points,
  }
}
