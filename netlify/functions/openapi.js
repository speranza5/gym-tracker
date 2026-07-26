import { buildOpenApiDocument } from './_lib/openapiSpec.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'

/**
 * GET /api/v1/openapi.json — spec pública, sin autenticación ni rate
 * limit (no toca la base de datos, es barata de generar y es justamente
 * la referencia que necesita alguien ANTES de tener una API Key).
 */
export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    if (request.method !== 'GET') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }

    const baseUrl = new URL(request.url).origin
    const document = await buildOpenApiDocument(baseUrl)
    return jsonResponse(200, document, { 'Cache-Control': 'public, max-age=60' })
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/openapi.json' }
