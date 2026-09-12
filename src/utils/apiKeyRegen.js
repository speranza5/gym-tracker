import { supabase } from '../lib/supabaseClient'

/**
 * Rota la API Key del usuario llamando al endpoint interno
 * POST /internal/api-key/regenerate (autenticado con la sesión de
 * Supabase, no con la key — ver docs/etapa-6-analisis.md). Devuelve la
 * key nueva. La anterior queda inválida en la misma escritura.
 */
export async function regenerateApiKey() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sin sesión activa.')

  const response = await fetch('/internal/api-key/regenerate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.apiKey) {
    throw new Error(body?.error?.message || 'No se pudo regenerar la API Key.')
  }
  return body.apiKey
}
