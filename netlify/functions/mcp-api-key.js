import { timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { HttpError } from './_lib/http.js'

/**
 * Resuelve el user_id (ya autenticado por gym-tracker-mcp vía OAuth) a la
 * API Key real de esa cuenta. Server-to-server únicamente — nunca debería
 * llegar a un navegador ni a Claude: el secreto compartido
 * (MCP_SERVICE_SECRET) es el único gate, sin CORS. Quien tenga ese
 * secreto puede pedir la API Key de cualquier user_id, así que se trata
 * con el mismo cuidado que SUPABASE_SERVICE_ROLE_KEY (ver docs/decisions.md).
 */
function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function checkServiceSecret(request) {
  const provided = request.headers.get('x-mcp-service-secret') || ''
  const expected = process.env.MCP_SERVICE_SECRET || ''

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  const valid =
    expected.length > 0 && providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)

  if (!valid) throw new HttpError(401, 'UNAUTHORIZED', 'Secreto de servicio inválido.')
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } })
  }

  try {
    checkServiceSecret(request)

    let body
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'INVALID_REQUEST', 'El body debe ser JSON válido.')
    }

    const userId = String(body?.userId ?? '')
    if (!userId) throw new HttpError(400, 'INVALID_REQUEST', 'Falta userId.')

    await checkRateLimit(userId)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from('api_keys').select('api_key').eq('user_id', userId).maybeSingle()

    if (error) throw new HttpError(500, 'INTERNAL_ERROR', 'No se pudo resolver la API Key.')
    if (!data) throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'No existe una API Key para ese user_id.')

    return json(200, { apiKey: data.api_key })
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { error: { code: error.code, message: error.message } })
    }
    console.error('Unhandled error in mcp-api-key:', error)
    return json(500, { error: { code: 'INTERNAL_ERROR', message: 'Error interno inesperado.' } })
  }
}

export const config = { path: '/internal/mcp/api-key' }
