import { getSupabaseAdmin } from './supabaseAdmin.js'
import { HttpError } from './http.js'

/**
 * Autentica un request de la API pública vía `Authorization: Bearer <api_key>`.
 * Devuelve el userId dueño de la key. Nunca usa RLS: la Function ya corre
 * con la service role key y filtra manualmente por user_id en cada query.
 */
export async function authenticate(request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Falta el header Authorization: Bearer <api_key>.')
  }

  const apiKey = match[1].trim()
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('api_keys')
    .select('user_id')
    .eq('api_key', apiKey)
    .maybeSingle()

  if (error || !data) {
    throw new HttpError(401, 'UNAUTHORIZED', 'API Key inválida.')
  }

  return data.user_id
}
