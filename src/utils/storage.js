const KEYS = {
  data: 'gymTracker:data',
  progress: 'gymTracker:progress',
  history: 'gymTracker:history',
}

/** Fecha local en formato YYYY-MM-DD, sin problemas de zona horaria. */
export function todayStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function loadWorkoutData() {
  try {
    const raw = localStorage.getItem(KEYS.data)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveWorkoutData(data) {
  localStorage.setItem(KEYS.data, JSON.stringify(data))
}

export function clearWorkoutData() {
  localStorage.removeItem(KEYS.data)
  localStorage.removeItem(KEYS.progress)
}

/**
 * Carga el progreso guardado. Si la fecha guardada no es la de hoy,
 * se devuelve progreso vacío: la rutina se resetea automáticamente
 * cada día.
 */
export function loadProgress() {
  const today = todayStr()
  try {
    const raw = localStorage.getItem(KEYS.progress)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || parsed.date !== today) {
      return { date: today, checked: {} }
    }
    return parsed
  } catch {
    return { date: today, checked: {} }
  }
}

export function saveProgress(progress) {
  localStorage.setItem(KEYS.progress, JSON.stringify(progress))
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEYS.history)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveHistory(history) {
  localStorage.setItem(KEYS.history, JSON.stringify(history))
}
