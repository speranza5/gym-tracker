import { supabase } from '../lib/supabaseClient'

const KEY_PREFIX = 'gt_live_'

function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${KEY_PREFIX}${hex}`
}

/**
 * Devuelve la API Key del usuario, generando una nueva la primera vez que
 * se le pide (ej: al abrir la pantalla "Open Tracker"). Es un dato de
 * cuenta protegido por RLS, no forma parte del contrato público de la API.
 */
export async function getOrCreateApiKey(userId) {
  const { data: existing, error: selectError } = await supabase
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing.api_key

  // ignoreDuplicates + un select posterior evita una condición de carrera si
  // este hook se dispara dos veces casi en simultáneo (ej: React StrictMode).
  const { error: upsertError } = await supabase
    .from('api_keys')
    .upsert(
      { user_id: userId, api_key: generateApiKey(), key_prefix: KEY_PREFIX },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
  if (upsertError) throw upsertError

  const { data: row, error: refetchError } = await supabase
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .single()

  if (refetchError) throw refetchError
  return row.api_key
}
