import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { generateApiKey } from './_lib/apiKeys.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { jsonResponse, errorResponse, HttpError } from './_lib/http.js'

// Orígenes que pueden llamar desde un navegador: el sitio en producción
// y localhost en dev. A diferencia de mcp-api-key.js (sin CORS a
// propósito), este endpoint lo llama la propia app — pero no se abre con
// wildcard: solo se refleja el Origin si está en la lista.
const ALLOWED_ORIGINS = ['https://gym-tracker.carlossperanza.fyi']
const LOCALHOST_ORIGIN = /^https?:\/\/localhost(:\d+)?$/

function corsHeaders(request) {
  const origin = request.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) || LOCALHOST_ORIGIN.test(origin) ? origin : ''
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

/**
 * Rota la API Key del usuario autenticado (sesión de Supabase, no la key).
 * Endpoint interno: fuera de /api/v1 y del spec de OpenAPI a propósito —
 * documentarlo en el Playground invitaría a rotar la key con un "Try it"
 * y romper la pre-auth del propio Playground. Un solo update atómico: la
 * key anterior queda inválida en la misma escritura, sin convivencia.
 */
async function handlePost(request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Falta el header Authorization: Bearer <supabase_access_token>.')
  }

  const admin = getSupabaseAdmin()
  const { data, error: userError } = await admin.auth.getUser(match[1].trim())
  if (userError || !data?.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Sesión de Supabase inválida o expirada.')
  }

  const userId = data.user.id
  await checkRateLimit(userId)

  const apiKey = generateApiKey()
  const { error } = await admin
    .from('api_keys')
    .upsert({ user_id: userId, api_key: apiKey, key_prefix: 'gt_live_' }, { onConflict: 'user_id' })
  if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo regenerar la API Key.')

  return jsonResponse(200, { apiKey }, corsHeaders(request))
}

export default async (request) => {
  const headers = corsHeaders(request)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }, headers)
  }

  try {
    return await handlePost(request)
  } catch (error) {
    const response = errorResponse(error)
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
    return response
  }
}

export const config = { path: '/internal/api-key/regenerate' }
