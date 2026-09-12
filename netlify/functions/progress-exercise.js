import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { authenticate } from './_lib/auth.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { parseRange } from './_lib/range.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'
import { buildExerciseProgress, buildExerciseSeries } from '../../src/domain/progress.js'

export default async (request, context) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)

    if (request.method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }

    // Netlify entrega el path param ya decodificado (espacios, acentos).
    const exerciseName = context.params.name
    const { from, to } = parseRange(request.url)
    const admin = getSupabaseAdmin()

    const [
      { data: sessionRows, error: sessionsError },
      { data: benchmarkRow, error: benchmarkError },
    ] = await Promise.all([
      admin
        .from('training_sessions')
        .select('date, recorded_at, exercises')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to),
      admin
        .from('exercise_benchmarks')
        .select('weight_kg')
        .eq('user_id', userId)
        .eq('exercise_name', exerciseName)
        .maybeSingle(),
    ])

    if (sessionsError || benchmarkError) {
      throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo leer el progreso.')
    }

    const series = buildExerciseSeries({
      sessionRows: sessionRows || [],
      benchmarkRow: benchmarkRow || null,
      exerciseName,
      from,
      to,
    })

    if (!series) {
      // Match exacto y case-sensitive: si el nombre no existe, se devuelve
      // la lista de nombres disponibles para que el consumidor reintente.
      const { exerciseNames } = buildExerciseProgress(sessionRows || [])
      throw new HttpError(404, 'EXERCISE_NOT_FOUND', `Sin datos para "${exerciseName}" en el rango.`, {
        availableExercises: exerciseNames,
      })
    }

    return jsonResponse(200, series)
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/progress/exercises/:name' }
