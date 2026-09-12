import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { authenticate } from './_lib/auth.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { parseRange } from './_lib/range.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'
import { summarizeProgress } from '../../src/domain/progress.js'

export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)

    if (request.method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }

    const { from, to } = parseRange(request.url)
    const admin = getSupabaseAdmin()

    const [{ data: historyRows, error: historyError }, { data: sessionRows, error: sessionsError }] =
      await Promise.all([
        admin.from('history').select('date').eq('user_id', userId).gte('date', from).lte('date', to),
        admin
          .from('training_sessions')
          .select('date, recorded_at, exercises')
          .eq('user_id', userId)
          .gte('date', from)
          .lte('date', to),
      ])

    if (historyError || sessionsError) {
      throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo leer el progreso.')
    }

    // Sin datos en el rango no es un error: contadores en cero.
    return jsonResponse(200, summarizeProgress({ historyRows: historyRows || [], sessionRows: sessionRows || [], from, to }))
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/progress/summary' }
