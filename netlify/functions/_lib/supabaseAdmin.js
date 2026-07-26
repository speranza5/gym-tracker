import { createClient } from '@supabase/supabase-js'

let client = null

/**
 * Cliente de Supabase con la service role key. Solo se usa server-side
 * (Netlify Functions) — nunca se expone al bundle del navegador.
 */
export function getSupabaseAdmin() {
  if (client) return client

  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno: VITE_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}
