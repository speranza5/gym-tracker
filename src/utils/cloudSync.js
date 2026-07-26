import { supabase } from '../lib/supabaseClient'

/**
 * Puente entre el estado local (localStorage) y las tablas de Supabase.
 * Todas las funciones son fire-and-forget: si falla (sin conexión, etc.)
 * se tragan el error y no rompen la UI, simplemente no sincronizan esa vez.
 */
export async function pullCloudState(userId) {
  try {
    const [routineRes, progressRes, historyRes] = await Promise.all([
      supabase.from('routines').select('file_name, days').eq('user_id', userId).maybeSingle(),
      supabase.from('progress').select('date, checked').eq('user_id', userId).maybeSingle(),
      supabase.from('history').select('date, day_id, day_name').eq('user_id', userId),
    ])
    if (routineRes.error || progressRes.error || historyRes.error) return null

    return {
      routine: routineRes.data
        ? { fileName: routineRes.data.file_name, days: routineRes.data.days }
        : null,
      progress: progressRes.data
        ? { date: progressRes.data.date, checked: progressRes.data.checked }
        : null,
      history: (historyRes.data || []).map((h) => ({
        date: h.date,
        dayId: h.day_id,
        dayName: h.day_name,
      })),
    }
  } catch {
    return null
  }
}

export async function pushRoutine(userId, workoutData) {
  try {
    await supabase.from('routines').upsert({
      user_id: userId,
      file_name: workoutData.fileName,
      days: workoutData.days,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // sin conexión u otro error transitorio: se reintenta en el próximo cambio
  }
}

export async function pushProgress(userId, progress) {
  try {
    await supabase.from('progress').upsert({
      user_id: userId,
      date: progress.date,
      checked: progress.checked,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // sin conexión u otro error transitorio: se reintenta en el próximo cambio
  }
}

export async function pushHistory(userId, history) {
  if (!history.length) return
  try {
    await supabase.from('history').upsert(
      history.map((h) => ({
        user_id: userId,
        date: h.date,
        day_id: h.dayId,
        day_name: h.dayName,
      })),
      { onConflict: 'user_id,date,day_id', ignoreDuplicates: true }
    )
  } catch {
    // sin conexión u otro error transitorio: se reintenta en el próximo cambio
  }
}
