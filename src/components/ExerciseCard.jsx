import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { getBlockColor } from '../utils/blockColors'

export function ExerciseCard({ exercise, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const color = getBlockColor(exercise.block)
  const hasDescription = Boolean(exercise.description)
  const meta = [exercise.series, exercise.repsTime].filter(Boolean).join(' · ')

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
            onToggle()
          }}
        >
          {checked && <Check size={18} strokeWidth={3} />}
        </button>

        <div className="exercise-card__info">
          <span className="exercise-card__name">{exercise.name}</span>
          {meta && <span className="exercise-card__meta">{meta}</span>}
        </div>

        {hasDescription && (
          <ChevronDown size={20} className={`exercise-card__chevron ${expanded ? 'is-open' : ''}`} />
        )}
      </div>

      {hasDescription && expanded && <p className="exercise-card__description">{exercise.description}</p>}
    </div>
  )
}
