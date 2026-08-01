import { useEffect, useState } from 'react'
import { ChevronLeft, Check, NotebookPen, PartyPopper } from 'lucide-react'
import { FocusCard } from './FocusCard'

function firstPendingIndex(day, checkedSet) {
  const index = day.exercises.findIndex((ex) => !checkedSet.has(ex.id))
  return index === -1 ? day.exercises.length : index
}

export function FocusView({
  day,
  checkedSet,
  onToggle,
  onExitToList,
  getBenchmark,
  showWeight,
  onRecordSession,
  canRecord,
}) {
  const [index, setIndex] = useState(() => firstPendingIndex(day, checkedSet))
  const [weightInput, setWeightInput] = useState('')

  // Al cambiar de ejercicio, precarga el input con su último benchmark.
  useEffect(() => {
    const exercise = day.exercises[index]
    if (!exercise) return
    const benchmark = getBenchmark?.(exercise.name)
    setWeightInput(benchmark != null ? String(benchmark) : '')
  }, [index, day, getBenchmark])

  const handleComplete = () => {
    const exercise = day.exercises[index]
    if (!checkedSet.has(exercise.id)) onToggle(exercise.id, exercise.name, weightInput)
    setIndex((i) => i + 1)
  }

  const handleBack = () => {
    if (index === 0) return
    const prevExercise = day.exercises[index - 1]
    if (checkedSet.has(prevExercise.id)) onToggle(prevExercise.id)
    setIndex((i) => i - 1)
  }

  if (index >= day.exercises.length) {
    return (
      <div className="focus-view focus-view__complete">
        <PartyPopper size={40} className="focus-view__complete-icon" />
        <h2 className="focus-view__complete-title">¡Día completado!</h2>
        <p className="focus-view__complete-subtitle">
          Terminaste los {day.exercises.length} ejercicios de {day.name}.
        </p>
        <div className="focus-view__complete-actions">
          {canRecord && (
            <button type="button" className="focus-view__record" onClick={onRecordSession}>
              <NotebookPen size={18} />
              Registrar sesión
            </button>
          )}
          <button type="button" className="focus-view__complete-btn" onClick={onExitToList}>
            Volver a la lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="focus-view">
      <span className="focus-view__counter">
        {index + 1} / {day.exercises.length}
      </span>

      <FocusCard
        exercise={day.exercises[index]}
        weightKg={weightInput}
        onWeightChange={setWeightInput}
        showWeight={showWeight}
      />

      <div className="focus-view__actions">
        <button
          type="button"
          className="focus-view__back"
          onClick={handleBack}
          disabled={index === 0}
        >
          <ChevronLeft size={20} />
          Anterior
        </button>
        <button type="button" className="focus-view__done" onClick={handleComplete}>
          <Check size={22} strokeWidth={3} />
          Completado
        </button>
      </div>
    </div>
  )
}
