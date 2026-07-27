import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { getOrCreateApiKey } from './_lib/apiKeys.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { jsonResponse, errorResponse, HttpError } from './_lib/http.js'

const MCP_ORIGIN = 'https://gym-tracker-mcp.netlify.app'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': MCP_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization',
}

/**
 * Resuelve una sesión de Supabase (login con Google) a {userId, email} y
 * garantiza que exista una API Key para ese usuario. Único caller
 * esperado: la pantalla de consentimiento OAuth de gym-tracker-mcp — por
 * eso el CORS está fijado a ese origen exacto, no al wildcard que usa la
 * API pública de rutinas (acá el único llamador legítimo desde el
 * navegador es uno solo). Nunca devuelve la API Key — solo la identidad.
 */
async function handleGet(request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Falta el header Authorization: Bearer <supabase_access_token>.')
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.getUser(match[1].trim())
  if (error || !data?.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Sesión de Supabase inválida o expirada.')
  }

  const { id: userId, email } = data.user
  await getOrCreateApiKey(userId)
  await checkRateLimit(userId)

  return jsonResponse(200, { userId, email }, CORS_HEADERS)
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }, CORS_HEADERS)
  }

  try {
    return await handleGet(request)
  } catch (error) {
    const response = errorResponse(error)
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }
}

export const config = { path: '/internal/mcp/identity' }
