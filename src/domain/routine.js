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

export const RoutineSummarySchema = z.object({
  fileName: z.string().nullable(),
  updatedAt: z.string().nullable(),
  dayCount: z.number().int().nonnegative(),
  exerciseCount: z.number().int().nonnegative(),
  blocks: z.array(
    z.object({
      name: z.string().nullable(),
      exerciseCount: z.number().int().nonnegative(),
    })
  ),
  days: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      exerciseCount: z.number().int().nonnegative(),
    })
  ),
})

/**
 * Normaliza un nombre de ejercicio para usarlo como clave de matching (ej.
 * benchmarks de peso) entre subidas de Excel distintas, donde el `id` del
 * ejercicio puede cambiar pero el nombre visible es el mismo.
 * @param {string} name
 */
export function normalizeExerciseName(name) {
  return String(name ?? '').trim().toLowerCase()
}

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
 * Resume una rutina a conteos + bloques + detalle por día. Pura: recibe
 * el DTO ya leído, no sabe de dónde vino (API vía service role o, a
 * futuro, otro transporte). Los ejercicios sin block van en un bucket con
 * name null para que la suma de bloques siempre coincida con el total.
 * @param {{fileName: string|null, days: Array<{id: string, name: string, exercises: Array<{block?: string}>}>, updatedAt?: string|null}} routine
 */
export function summarizeRoutine(routine) {
  const days = routine.days ?? []
  const blocks = []
  const blockIndex = new Map()
  let exerciseCount = 0

  for (const day of days) {
    const exercises = day.exercises ?? []
    for (const exercise of exercises) {
      exerciseCount += 1
      const raw = typeof exercise.block === 'string' ? exercise.block.trim() : ''
      const name = raw === '' ? null : raw
      // Map acepta null como clave: el bucket "sin bloque" es uno solo.
      if (!blockIndex.has(name)) {
        blockIndex.set(name, blocks.length)
        blocks.push({ name, exerciseCount: 0 })
      }
      blocks[blockIndex.get(name)].exerciseCount += 1
    }
  }

  return {
    fileName: routine.fileName ?? null,
    updatedAt: routine.updatedAt ?? null,
    dayCount: days.length,
    exerciseCount,
    blocks,
    days: days.map((day) => ({
      id: day.id,
      name: day.name,
      exerciseCount: (day.exercises ?? []).length,
    })),
  }
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
