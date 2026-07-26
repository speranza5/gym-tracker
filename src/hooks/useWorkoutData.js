import { useCallback, useEffect, useRef, useState } from 'react'
import { parseWorkoutExcel } from '../utils/excelParser'
import { loadWorkoutData, saveWorkoutData, clearWorkoutData } from '../utils/storage'
import { pullCloudState, pushRoutine } from '../utils/cloudSync'

/**
 * Maneja la carga del Excel, su parseo y persistencia en localStorage
 * para no tener que volver a subir el archivo en cada visita. Si hay
 * sesión (userId), además sincroniza la rutina con Supabase.
 */
export function useWorkoutData(userId) {
  const [workoutData, setWorkoutData] = useState(() => loadWorkoutData())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const workoutDataRef = useRef(workoutData)
  workoutDataRef.current = workoutData

  // Al loguearse: si hay rutina en la nube gana la nube (cubre el caso de
  // loguearse en un segundo dispositivo); si no hay fila remota todavía y
  // sí había datos de invitado, se migran subiéndolos.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    pullCloudState(userId).then((cloud) => {
      if (cancelled) return
      if (cloud?.routine) {
        saveWorkoutData(cloud.routine)
        setWorkoutData(cloud.routine)
      } else if (workoutDataRef.current) {
        pushRoutine(userId, workoutDataRef.current)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Mientras haya sesión, cada cambio de rutina se sincroniza en background.
  useEffect(() => {
    if (!userId || !workoutData) return
    pushRoutine(userId, workoutData)
  }, [userId, workoutData])

  const uploadFile = useCallback(async (file) => {
    setError('')
    setLoading(true)
    try {
      const days = await parseWorkoutExcel(file)
      const data = { fileName: file.name, days }
      saveWorkoutData(data)
      setWorkoutData(data)
    } catch (e) {
      setError(e.message || 'No se pudo leer el archivo. Verificá que sea un .xlsx válido.')
    } finally {
      setLoading(false)
    }
  }, [])

  const resetWorkoutData = useCallback(() => {
    clearWorkoutData()
    setWorkoutData(null)
  }, [])

  return { workoutData, uploadFile, error, loading, resetWorkoutData }
}
