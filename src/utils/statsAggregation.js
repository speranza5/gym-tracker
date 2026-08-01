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
