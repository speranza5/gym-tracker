import { randomBytes } from 'node:crypto'
import { getSupabaseAdmin } from './supabaseAdmin.js'

const KEY_PREFIX = 'gt_live_'

function generateApiKey() {
  return `${KEY_PREFIX}${randomBytes(20).toString('hex')}`
}

/**
 * Espejo server-side de src/utils/apiKeys.js — mismo patrón race-safe
 * (upsert con ignoreDuplicates + reselect), pero contra el admin client
 * (bypassa RLS) para poder llamarse desde una Function sin sesión de
 * usuario en el navegador (ver netlify/functions/mcp-identity.js).
 */
export async function getOrCreateApiKey(userId) {
  const admin = getSupabaseAdmin()

  const { data: existing, error: selectError } = await admin
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing.api_key

  const { error: upsertError } = await admin
    .from('api_keys')
    .upsert(
      { user_id: userId, api_key: generateApiKey(), key_prefix: KEY_PREFIX },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
  if (upsertError) throw upsertError

  const { data: row, error: refetchError } = await admin
    .from('api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .single()

  if (refetchError) throw refetchError
  return row.api_key
}
