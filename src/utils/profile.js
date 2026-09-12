import { supabase } from '../lib/supabaseClient'

/**
 * Lee el flag "ya vio el tour" de la tabla profiles. Una cuenta sin fila
 * (nueva, posterior al backfill) cuenta como "no visto".
 */
export async function hasSeenWelcomeTour(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('welcome_tour_seen_at')
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data?.welcome_tour_seen_at)
}

/**
 * Marca el tour como visto. Upsert porque una cuenta nueva todavía no
 * tiene fila en profiles (el backfill solo cubrió las existentes).
 */
export async function markWelcomeTourSeen(userId) {
  await supabase
    .from('profiles')
    .upsert({ user_id: userId, welcome_tour_seen_at: new Date().toISOString() })
}
