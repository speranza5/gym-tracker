import { getSupabaseAdmin } from './supabaseAdmin.js'
import { HttpError } from './http.js'

const REQUESTS_PER_MINUTE = 60

/**
 * Rate limiter simple de ventana fija (1 minuto) por usuario, respaldado
 * en Postgres vía el RPC `increment_rate_limit` (upsert atómico). No busca
 * ser una solución enterprise, solo evitar loops o uso accidental excesivo.
 */
export async function checkRateLimit(userId) {
  const admin = getSupabaseAdmin()
  const windowStart = new Date()
  windowStart.setSeconds(0, 0)

  const { data: count, error } = await admin.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_window: windowStart.toISOString(),
  })

  if (error) {
    // Si el rate limiter falla (ej: función no creada todavía), no bloqueamos
    // la request por eso — se loguea y se deja pasar.
    console.error('Rate limiter error:', error)
    return
  }

  if (count > REQUESTS_PER_MINUTE) {
    throw new HttpError(429, 'RATE_LIMITED', `Límite de ${REQUESTS_PER_MINUTE} requests/minuto excedido.`)
  }
}
