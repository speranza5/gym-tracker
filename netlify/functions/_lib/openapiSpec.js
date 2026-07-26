import { z } from 'zod'
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'

// Tiene que correr ANTES de que se construya cualquier schema de Zod en el
// proceso (incluidos los de src/domain/routine.js) — por eso ese import es
// dinámico más abajo: los imports estáticos de ES modules se evalúan antes
// que el cuerpo de este archivo, así que un `import ... from` normal de
// domain/routine.js construiría los schemas antes de este `extendZodWithOpenApi`,
// y quedarían sin el método `.openapi()`.
extendZodWithOpenApi(z)

let registryPromise = null

async function buildRegistry() {
  const { ExerciseSchema, DaySchema, RoutineInputSchema } = await import('../../../src/domain/routine.js')

  const registry = new OpenAPIRegistry()

  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description: 'API Key de Gym Tracker (Open Tracker), obtenida en la app.',
  })

  registry.register('Exercise', ExerciseSchema)
  registry.register('Day', DaySchema)
  registry.register('RoutineInput', RoutineInputSchema)

  const RoutineResponseSchema = RoutineInputSchema.extend({
    updatedAt: z.string().nullable().openapi({ example: '2026-07-26T14:32:10.000Z' }),
  }).openapi('Routine')

  const ErrorSchema = z
    .object({
      error: z.object({
        code: z.string().openapi({ example: 'INVALID_ROUTINE' }),
        message: z.string().openapi({ example: 'Rutina inválida: "days" debe ser un array con al menos un día' }),
        issues: z.array(z.string()).optional(),
      }),
    })
    .openapi('Error')

  const errorResponse = (description) => ({
    description,
    content: { 'application/json': { schema: ErrorSchema } },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/v1/routine',
    summary: 'Obtener la rutina del usuario autenticado',
    tags: ['Routine'],
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: 'La rutina completa del usuario.',
        content: { 'application/json': { schema: RoutineResponseSchema } },
      },
      401: errorResponse('Falta el header Authorization, o la API Key no es válida.'),
      404: errorResponse('El usuario todavía no cargó ninguna rutina.'),
      429: errorResponse('Se superó el límite de requests por minuto.'),
    },
  })

  registry.registerPath({
    method: 'put',
    path: '/api/v1/routine',
    summary: 'Reemplazar completamente la rutina del usuario autenticado',
    tags: ['Routine'],
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: RoutineInputSchema } },
      },
    },
    responses: {
      200: {
        description: 'La rutina ya guardada.',
        content: { 'application/json': { schema: RoutineResponseSchema } },
      },
      400: errorResponse('El body no tiene la forma de una rutina válida (ver `issues`).'),
      401: errorResponse('Falta el header Authorization, o la API Key no es válida.'),
      429: errorResponse('Se superó el límite de requests por minuto.'),
    },
  })

  return registry
}

/**
 * Arma el documento OpenAPI completo. El registro de schemas/paths se
 * construye una sola vez (memoizado); el documento en sí se regenera en
 * cada llamada (barato, sin I/O) para que el `servers.url` refleje el host
 * real de cada request.
 * @param {string} baseUrl - ej: "https://gym-tracker.carlossperanza.fyi"
 */
export async function buildOpenApiDocument(baseUrl) {
  if (!registryPromise) registryPromise = buildRegistry()
  const registry = await registryPromise

  const generator = new OpenApiGeneratorV3(registry.definitions)
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Open Tracker API',
      version: '1.0.0',
      description:
        'API pública de Gym Tracker para leer y actualizar la rutina de un usuario. ' +
        'Pensada para agentes de IA, el futuro servidor MCP (gym-tracker-mcp), y otras integraciones externas.',
    },
    servers: [{ url: `${baseUrl}` }],
  })
}
