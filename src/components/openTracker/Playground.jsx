import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

/**
 * Documentación interactiva de la API, generada desde el spec de OpenAPI
 * (`/api/v1/openapi.json`, a su vez generado desde los mismos schemas de
 * Zod que validan `PUT /api/v1/routine` — no hay un spec mantenido a mano
 * por separado). Se autentica con la API Key real del usuario para poder
 * ejecutar requests desde acá con la menor fricción posible.
 */
export default function Playground({ apiKey }) {
  return (
    <ApiReferenceReact
      configuration={{
        url: '/api/v1/openapi.json',
        authentication: {
          preferredSecurityScheme: 'bearerAuth',
          securitySchemes: {
            bearerAuth: { token: apiKey },
          },
        },
      }}
    />
  )
}
