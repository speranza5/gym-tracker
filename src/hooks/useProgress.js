import { useCallback, useEffect, useRef, useState } from 'react'
import { loadProgress, saveProgress, loadHistory, saveHistory, todayStr } from '../utils/storage'
import { pullCloudState, pushProgress, pushHistory, pushBenchmark } from '../utils/cloudSync'
import { normalizeExerciseName } from '../domain/routine'

/**
 * Maneja el progreso (checkboxes) del día actual y el historial de
 * días completados al 100%, para poder calcular racha de consistencia
 * más adelante. Si hay sesión (userId), además sincroniza con Supabase y
 * maneja el benchmark de peso por ejercicio (Etapa 8) — sin sesión no hay
 * benchmarks, es la primera feature de la app que requiere login.
 */
export function useProgress(workoutData, userId) {
  const [progress, setProgress] = useState(() => loadProgress())
  const [history, setHistory] = useState(() => loadHistory())
  const [benchmarks, setBenchmarks] = useState({})

  const progressRef = useRef(progress)
  progressRef.current = progress
  const historyRef = useRef(history)
  historyRef.current = history

  // Si la app queda abierta y cruza la medianoche, se resetea el progreso
  // igual que si se reabriera un día distinto.
  useEffect(() => {
    const interval = setInterval(() => {
      const today = todayStr()
      setProgress((prev) => (prev.date === today ? prev : { date: today, checked: {} }))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Al loguearse: si hay progreso/historial en la nube gana la nube; si no
  // hay fila remota todavía y sí había datos de invitado, se migran
  // subiéndolos.
  useEffect(() => {
    if (!userId) {
      // Sin sesión no hay benchmarks — se limpian para no arrastrar los de
      // un usuario anterior si alguien se desloguea en el mismo dispositivo.
      setBenchmarks({})
      return
    }
    let cancelled = false
    pullCloudState(userId).then((cloud) => {
      if (cancelled || !cloud) return

      if (cloud.progress) {
        const today = todayStr()
        setProgress(cloud.progress.date === today ? cloud.progress : { date: today, checked: {} })
      } else if (Object.keys(progressRef.current.checked).length) {
        pushProgress(userId, progressRef.current)
      }

      if (cloud.history.length) {
        setHistory(cloud.history)
      } else if (historyRef.current.length) {
        pushHistory(userId, historyRef.current)
      }

      setBenchmarks(cloud.benchmarks || {})
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    saveProgress(progress)
    if (userId) pushProgress(userId, progress)
  }, [progress, userId])

  useEffect(() => {
    saveHistory(history)
    if (userId) pushHistory(userId, history)
  }, [history, userId])

  const setBenchmark = useCallback(
    (exerciseName, weightKg) => {
      if (!userId) return
      const key = normalizeExerciseName(exerciseName)
      const numeric = Number(weightKg)
      if (!key || Number.isNaN(numeric)) return
      setBenchmarks((prev) => ({ ...prev, [key]: numeric }))
      pushBenchmark(userId, key, numeric)
    },
    [userId]
  )

  const getBenchmark = useCallback(
    (exerciseName) => {
      const key = normalizeExerciseName(exerciseName)
      return key in benchmarks ? benchmarks[key] : null
    },
    [benchmarks]
  )

  // El peso solo se guarda junto con la acción de marcar como hecho (no al
  // tipear ni al destildar) — ver docs/etapa-8-analisis.md.
  const toggleExercise = useCallback(
    (dayId, exerciseId, exerciseName, weightKg) => {
      const wasChecked = (progressRef.current.checked[dayId] || []).includes(exerciseId)
      setProgress((prev) => {
        const current = new Set(prev.checked[dayId] || [])
        if (current.has(exerciseId)) current.delete(exerciseId)
        else current.add(exerciseId)
        return { ...prev, checked: { ...prev.checked, [dayId]: Array.from(current) } }
      })
      if (!wasChecked && weightKg !== '' && weightKg != null) {
        setBenchmark(exerciseName, weightKg)
      }
    },
    [setBenchmark]
  )

  const resetDay = useCallback((dayId) => {
    setProgress((prev) => ({ ...prev, checked: { ...prev.checked, [dayId]: [] } }))
  }, [])

  const getDayChecked = useCallback(
    (dayId) => new Set(progress.checked[dayId] || []),
    [progress]
  )

  const getDayPercent = useCallback(
    (day) => {
      if (!day || !day.exercises.length) return 0
      const checked = progress.checked[day.id] || []
      return Math.round((checked.length / day.exercises.length) * 100)
    },
    [progress]
  )

  // Cada vez que un día llega al 100%, se registra en el historial
  // (deduplicado por fecha + día) para poder mostrar racha después.
  useEffect(() => {
    if (!workoutData) return
    workoutData.days.forEach((day) => {
      const checkedCount = (progress.checked[day.id] || []).length
      const percent = day.exercises.length ? Math.round((checkedCount / day.exercises.length) * 100) : 0
      if (percent !== 100) return

      setHistory((prev) => {
        const exists = prev.some((h) => h.date === progress.date && h.dayId === day.id)
        if (exists) return prev
        return [...prev, { date: progress.date, dayId: day.id, dayName: day.name }]
      })
    })
  }, [progress, workoutData])

  return {
    progress,
    history,
    benchmarks,
    toggleExercise,
    resetDay,
    getDayChecked,
    getDayPercent,
    getBenchmark,
  }
}
