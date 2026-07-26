/**
 * Modelo de dominio de la rutina, compartido por el importador de Excel
 * (navegador), la API REST (Netlify Functions) y, a futuro, el servidor MCP.
 * Sin dependencias de React, del navegador ni de Supabase — funciones puras.
 *
 * @typedef {object} Exercise
 * @property {string} id
 * @property {string} block
 * @property {string} name
 * @property {string} series
 * @property {string} repsTime
 * @property {string} description
 *
 * @typedef {object} Day
 * @property {string} id
 * @property {string} name
 * @property {Exercise[]} exercises
 *
 * @typedef {object} Routine
 * @property {string|null} fileName
 * @property {Day[]} days
 */

export class RoutineValidationError extends Error {
  constructor(issues) {
    super(`Rutina inválida: ${issues.join('; ')}`)
    this.name = 'RoutineValidationError'
    this.issues = issues
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Valida la forma de una rutina candidata (ej: body de un PUT externo).
 * Tira RoutineValidationError con el detalle de cada problema si no es válida.
 * @param {unknown} input
 */
export function assertValidRoutine(input) {
  const issues = []

  if (!input || typeof input !== 'object') {
    throw new RoutineValidationError(['el body debe ser un objeto con al menos "days"'])
  }

  if (input.fileName != null && typeof input.fileName !== 'string') {
    issues.push('"fileName" debe ser un string u omitirse')
  }

  if (!Array.isArray(input.days) || input.days.length === 0) {
    issues.push('"days" debe ser un array con al menos un día')
  } else {
    input.days.forEach((day, dayIndex) => {
      if (!day || typeof day !== 'object') {
        issues.push(`days[${dayIndex}] debe ser un objeto`)
        return
      }
      if (!isNonEmptyString(day.id)) issues.push(`days[${dayIndex}].id debe ser un string no vacío`)
      if (!isNonEmptyString(day.name)) issues.push(`days[${dayIndex}].name debe ser un string no vacío`)
      if (!Array.isArray(day.exercises)) {
        issues.push(`days[${dayIndex}].exercises debe ser un array`)
        return
      }
      day.exercises.forEach((exercise, exIndex) => {
        if (!exercise || typeof exercise !== 'object') {
          issues.push(`days[${dayIndex}].exercises[${exIndex}] debe ser un objeto`)
          return
        }
        if (!isNonEmptyString(exercise.id)) {
          issues.push(`days[${dayIndex}].exercises[${exIndex}].id debe ser un string no vacío`)
        }
        if (!isNonEmptyString(exercise.name)) {
          issues.push(`days[${dayIndex}].exercises[${exIndex}].name debe ser un string no vacío`)
        }
      })
    })
  }

  if (issues.length) throw new RoutineValidationError(issues)
}

/**
 * Valida y normaliza una rutina candidata a su forma canónica.
 * @param {unknown} input
 * @returns {Routine}
 */
export function normalizeRoutine(input) {
  assertValidRoutine(input)

  return {
    fileName: input.fileName != null ? String(input.fileName).trim() : null,
    days: input.days.map((day) => ({
      id: String(day.id).trim(),
      name: String(day.name).trim(),
      exercises: day.exercises.map((exercise) => ({
        id: String(exercise.id).trim(),
        name: String(exercise.name).trim(),
        block: exercise.block != null ? String(exercise.block).trim() : '',
        series: exercise.series != null ? String(exercise.series).trim() : '',
        repsTime: exercise.repsTime != null ? String(exercise.repsTime).trim() : '',
        description: exercise.description != null ? String(exercise.description).trim() : '',
      })),
    })),
  }
}

/**
 * Mapea una Routine (DTO público) a la forma de fila de la tabla `routines`.
 * @param {string} userId
 * @param {Routine} routine
 */
export function toRoutineRow(userId, routine) {
  return {
    user_id: userId,
    file_name: routine.fileName,
    days: routine.days,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Mapea una fila de la tabla `routines` a su DTO público.
 * @param {{file_name: string|null, days: Day[], updated_at?: string}} row
 * @returns {Routine & {updatedAt: string|null}}
 */
export function fromRoutineRow(row) {
  return {
    fileName: row.file_name ?? null,
    days: row.days,
    updatedAt: row.updated_at ?? null,
  }
}
