/**
 * Agregaciones para la pantalla de estadísticas (Etapa 10). Puras — sin
 * red, sin React — operan sobre lo que ya devolvieron
 * pullHistoryInRange/pullSessionsInRange.
 */

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
