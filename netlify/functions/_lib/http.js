export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  })
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    const body = { error: { code: error.code, message: error.message, ...error.extra } }
    const headers = error.status === 429 ? { 'Retry-After': '60' } : {}
    return jsonResponse(error.status, body, headers)
  }

  console.error('Unhandled error in Open Tracker API:', error)
  return jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'Error interno inesperado.' } })
}

export function preflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
