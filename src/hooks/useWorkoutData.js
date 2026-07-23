import { useCallback, useState } from 'react'
import { parseWorkoutExcel } from '../utils/excelParser'
import { loadWorkoutData, saveWorkoutData, clearWorkoutData } from '../utils/storage'

/**
 * Maneja la carga del Excel, su parseo y persistencia en localStorage
 * para no tener que volver a subir el archivo en cada visita.
 */
export function useWorkoutData() {
  const [workoutData, setWorkoutData] = useState(() => loadWorkoutData())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
