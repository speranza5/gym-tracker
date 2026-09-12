import { authenticate } from './_lib/auth.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { jsonResponse, errorResponse, preflightResponse, HttpError } from './_lib/http.js'
import { assertValidRoutine, RoutineValidationError } from '../../src/domain/routine.js'

export default async (request) => {
  if (request.method === 'OPTIONS') return preflightResponse()

  try {
    const userId = await authenticate(request)
    await checkRateLimit(userId)

    if (request.method !== 'POST') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `Método ${request.method} no soportado en este endpoint.`)
    }

    let body
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'INVALID_ROUTINE', 'El body debe ser JSON válido.')
    }

    // Una rutina inválida no es un error HTTP: la validación funcionó y
    // la respuesta es "no". Solo el body inparseable es un 400.
    try {
      assertValidRoutine(body)
    } catch (e) {
      if (e instanceof RoutineValidationError) {
        return jsonResponse(200, { valid: false, issues: e.issues })
      }
      throw e
    }

    return jsonResponse(200, { valid: true })
  } catch (error) {
    return errorResponse(error)
  }
}

export const config = { path: '/api/v1/routine/validate' }
