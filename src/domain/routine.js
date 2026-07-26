import { z } from 'zod'

/**
 * Modelo de dominio de la rutina, compartido por el importador de Excel
 * (navegador), la API REST (Netlify Functions) y, a futuro, el servidor MCP.
 * Sin dependencias de React, del navegador ni de Supabase — funciones puras.
 *
 * Los schemas de Zod de acá abajo son la única definición de "qué es una
 * rutina válida": la usan tanto `assertValidRoutine`/`normalizeRoutine` para
 * validar en runtime como `netlify/functions/_lib/openapiSpec.js` para
 * generar el spec de OpenAPI — no hay una segunda copia de estas reglas.
 */

// Coerce a texto libre igual que antes de introducir Zod: null/undefined
// se convierten en '' (no error), cualquier otro valor se castea con
// String() y se recorta — nunca rechaza un valor por su tipo.
const freeText = z.preprocess((v) => (v == null ? '' : String(v).trim()), z.string())

// Requerido: tiene que ser un string no vacío después de recortar espacios
// (un string de solo espacios se considera vacío, igual que antes).
const requiredId = z.string().trim().min(1)

export const ExerciseSchema = z.object({
  id: requiredId,
  name: requiredId,
  block: freeText,
  series: freeText,
  repsTime: freeText,
  description: freeText,
})

export const DaySchema = z.object({
  id: requiredId,
  name: requiredId,
  exercises: z.array(ExerciseSchema),
})

export const RoutineInputSchema = z.object({
  fileName: z.preprocess((v) => (v == null ? null : v), z.string().trim().nullable()),
  days: z.array(DaySchema).min(1),
})

export class RoutineValidationError extends Error {
  constructor(issues) {
    super(`Rutina inválida: ${issues.join('; ')}`)
    this.name = 'RoutineValidationError'
    this.issues = issues
  }
}

function formatPath(path) {
  return path.reduce((acc, segment, i) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`
    return i === 0 ? String(segment) : `${acc}.${segment}`
  }, '')
}

function formatZodError(error) {
  return error.issues.map((issue) => {
    const path = formatPath(issue.path)
    if (!path) return 'el body debe ser un objeto con al menos "days"'
    if (path === 'days') return '"days" debe ser un array con al menos un día'
    return `${path}: ${issue.message}`
  })
}

/**
 * Valida la forma de una rutina candidata (ej: body de un PUT externo).
 * Tira RoutineValidationError con el detalle de cada problema si no es válida.
 * @param {unknown} input
 */
export function assertValidRoutine(input) {
  const result = RoutineInputSchema.safeParse(input)
  if (!result.success) throw new RoutineValidationError(formatZodError(result.error))
}

/**
 * Valida y normaliza una rutina candidata a su forma canónica.
 * @param {unknown} input
 * @returns {import('zod').infer<typeof RoutineInputSchema>}
 */
export function normalizeRoutine(input) {
  const result = RoutineInputSchema.safeParse(input)
  if (!result.success) throw new RoutineValidationError(formatZodError(result.error))
  return result.data
}

/**
 * Mapea una Routine (DTO público) a la forma de fila de la tabla `routines`.
 * @param {string} userId
 * @param {{fileName: string|null, days: unknown}} routine
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
 * @param {{file_name: string|null, days: unknown, updated_at?: string}} row
 */
export function fromRoutineRow(row) {
  return {
    fileName: row.file_name ?? null,
    days: row.days,
    updatedAt: row.updated_at ?? null,
  }
}
