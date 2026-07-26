import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { authenticate } from './_lib/auth.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'
import { normalizeRoutine, toRoutineRow, fromRoutineRow, RoutineValidationError } from '../../src/domain/routine.js'

async function handleGet(userId) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('routines')
    .select('file_name, days, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo leer la rutina.')
  if (!data) throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'Todavía no hay una rutina cargada para este usuario.')

  return jsonResponse(200, fromRoutineRow(data))
}

async function handlePut(userId, request) {
  let body
  try {
    body = await request.json()
  } catch {
    throw new HttpError(400, 'INVALID_ROUTINE', 'El body debe ser JSON válido.')
  }

  let routine
  try {
    routine = normalizeRoutine(body)
  } catch (e) {
    if (e instanceof RoutineValidationError) {
      throw new HttpError(400, 'INVALID_ROUTINE', e.message, { issues: e.issues })
    }
    throw e
  }

  const admin = getSupabaseAdmin()
  const row = toRoutineRow(userId, routine)
  const { error } = await admin.from('routines').upsert(row)
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo guardar la rutina.')

  return jsonResponse(200, fromRoutineRow(row))
}

export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)

    if (request.method === 'GET') return await handleGet(userId)
    if (request.method === 'PUT') return await handlePut(userId, request)

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/routine' }
