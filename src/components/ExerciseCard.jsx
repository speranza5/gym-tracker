import { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { getBlockColor } from '../utils/blockColors'

export function ExerciseCard({ exercise, checked, onToggle, weightKg, showWeight }) {
  const [expanded, setExpanded] = useState(false)
  const [weightInput, setWeightInput] = useState(weightKg != null ? String(weightKg) : '')
  const color = getBlockColor(exercise.block)
  const hasDescription = Boolean(exercise.description)
  const meta = [exercise.series, exercise.repsTime].filter(Boolean).join(' · ')

  // Prefill/actualiza cuando llega el benchmark real (ej. tras el pull
  // inicial a la nube, que resuelve después del primer render).
  useEffect(() => {
    setWeightInput(weightKg != null ? String(weightKg) : '')
  }, [weightKg])

  return (
    <div
      className={`exercise-card ${checked ? 'is-checked' : ''}`}
      style={{ '--block-color': color }}
      onClick={() => hasDescription && setExpanded((v) => !v)}
    >
      <div className="exercise-card__row">
        <button
          type="button"
          className="exercise-card__checkbox"
          aria-label={checked ? 'Marcar como no hecho' : 'Marcar como hecho'}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(weightInput)
          }}
        >
          {checked && <Check size={18} strokeWidth={3} />}
        </button>

        <div className="exercise-card__info">
          <span className="exercise-card__name">{exercise.name}</span>
          {meta && <span className="exercise-card__meta">{meta}</span>}
        </div>

        {showWeight && (
          <input
            type="number"
            inputMode="decimal"
            className="exercise-card__weight"
            placeholder="kg"
            value={weightInput}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setWeightInput(e.target.value)}
          />
        )}

        {hasDescription && (
          <ChevronDown size={20} className={`exercise-card__chevron ${expanded ? 'is-open' : ''}`} />
        )}
      </div>

      {hasDescription && expanded && <p className="exercise-card__description">{exercise.description}</p>}
    </div>
  )
}
