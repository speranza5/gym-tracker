import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { authenticate } from './_lib/auth.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'
import { summarizeRoutine, fromRoutineRow } from '../../src/domain/routine.js'

export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)

    if (request.method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('routines')
      .select('file_name, days, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo leer la rutina.')
    if (!data) throw new HttpError(404, 'ROUTINE_NOT_FOUND', 'Todavía no hay una rutina cargada para este usuario.')

    return jsonResponse(200, summarizeRoutine(fromRoutineRow(data)))
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/routine/summary' }
