import { useEffect, useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { FileUpload } from './components/FileUpload'
import { DayTabs } from './components/DayTabs'
import { ProgressBar } from './components/ProgressBar'
import { ExerciseList } from './components/ExerciseList'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useProgress } from './hooks/useProgress'
import './App.css'

function App() {
  const { workoutData, uploadFile, error, loading, resetWorkoutData } = useWorkoutData()
  const { toggleExercise, resetDay, getDayChecked, getDayPercent } = useProgress(workoutData)

  const [activeDayId, setActiveDayId] = useState(null)

  // Selecciona el primer día por defecto y se acomoda si el día activo
  // deja de existir (ej: se sube un Excel nuevo con menos hojas).
  useEffect(() => {
    if (!workoutData?.days?.length) return
    const stillExists = workoutData.days.some((d) => d.id === activeDayId)
    if (!activeDayId || !stillExists) {
      setActiveDayId(workoutData.days[0].id)
    }
  }, [workoutData, activeDayId])

  if (!workoutData) {
    return <FileUpload onFile={uploadFile} loading={loading} error={error} />
  }

  const activeDay = workoutData.days.find((d) => d.id === activeDayId) || workoutData.days[0]
  const checkedSet = getDayChecked(activeDay.id)
  const percent = getDayPercent(activeDay)

  const handleChangeFile = () => {
    if (window.confirm('¿Cambiar de archivo? Se va a perder el progreso del día actual.')) {
      resetWorkoutData()
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">
          <Dumbbell size={20} />
          <span>Mi Rutina</span>
        </div>
        <button type="button" className="app__change-file" onClick={handleChangeFile}>
          Cambiar archivo
        </button>
      </header>

      <DayTabs days={workoutData.days} activeDayId={activeDay.id} onSelect={setActiveDayId} />

      <ProgressBar percent={percent} onReset={() => resetDay(activeDay.id)} />

      <main className="app__content">
        <ExerciseList
          day={activeDay}
          checkedSet={checkedSet}
          onToggle={(exerciseId) => toggleExercise(activeDay.id, exerciseId)}
        />
      </main>
    </div>
  )
}

export default App
