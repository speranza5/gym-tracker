import { supabase } from '../lib/supabaseClient'
import { toRoutineRow, fromRoutineRow } from '../domain/routine'

/**
 * Puente entre el estado local (localStorage) y las tablas de Supabase.
 * Todas las funciones son fire-and-forget: si falla (sin conexión, etc.)
 * se tragan el error y no rompen la UI, simplemente no sincronizan esa vez.
 */
export async function pullCloudState(userId) {
  try {
    const [routineRes, progressRes, historyRes, benchmarksRes] = await Promise.all([
      supabase.from('routines').select('file_name, days, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('progress').select('date, checked').eq('user_id', userId).maybeSingle(),
      supabase.from('history').select('date, day_id, day_name').eq('user_id', userId),
      supabase.from('exercise_benchmarks').select('exercise_name, weight_kg').eq('user_id', userId),
    ])
    if (routineRes.error || progressRes.error || historyRes.error || benchmarksRes.error) return null

    return {
      routine: routineRes.data ? fromRoutineRow(routineRes.data) : null,
      progress: progressRes.data
        ? { date: progressRes.data.date, checked: progressRes.data.checked }
        : null,
      history: (historyRes.data || []).map((h) => ({
        date: h.date,
        dayId: h.day_id,
        dayName: h.day_name,
      })),
      benchmarks: Object.fromEntries(
        (benchmarksRes.data || []).map((b) => [b.exercise_name, Number(b.weight_kg)])
      ),
    }
  } catch {
    return null
  }
}

export async function pushRoutine(userId, workoutData) {
  try {
    await supabase.from('routines').upsert(toRoutineRow(userId, workoutData))
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

export async function pushBenchmark(userId, exerciseName, weightKg) {
  try {
    await supabase.from('exercise_benchmarks').upsert({
      user_id: userId,
      exercise_name: exerciseName,
      weight_kg: weightKg,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // sin conexión u otro error transitorio: se reintenta en el próximo cambio
  }
}

// Lecturas filtradas por rango de fechas, para la pantalla de
// estadísticas (Etapa 10) — a diferencia de pullCloudState, que trae
// `history` completo sin filtro. Fallan en silencio a un array vacío,
// mismo criterio que el resto de este archivo (nunca propagan el error).
export async function pullHistoryInRange(userId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('history')
      .select('date, day_id, day_name')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export async function pullSessionsInRange(userId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('date, exercises')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// A diferencia del resto de este archivo (upsert de un estado único), acá
// es insert puro: varias sesiones registradas el mismo día son filas
// distintas, a propósito (ver docs/etapa-9-analisis.md).
export async function pushSession(userId, session) {
  try {
    await supabase.from('training_sessions').insert({
      user_id: userId,
      date: session.date,
      day_id: session.dayId,
      day_name: session.dayName,
      exercises: session.exercises,
      notes: session.notes || null,
    })
  } catch {
    // sin conexión u otro error transitorio: la sesión no queda registrada
    // y no hay reintento automático (a diferencia de progress/history, acá
    // no hay un estado local persistente del que reintentar)
  }
}
