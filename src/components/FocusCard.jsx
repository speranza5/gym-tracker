import { getBlockColor } from '../utils/blockColors'

export function FocusCard({ exercise, weightKg, onWeightChange, showWeight }) {
  const color = getBlockColor(exercise.block)
  const meta = [exercise.series, exercise.repsTime].filter(Boolean).join(' · ')

  return (
    <div className="focus-card" style={{ '--block-color': color }}>
      <span className="focus-card__block">{exercise.block}</span>
      <h2 className="focus-card__name">{exercise.name}</h2>
      {meta && <span className="focus-card__meta">{meta}</span>}
      {exercise.description && <p className="focus-card__description">{exercise.description}</p>}

      {showWeight && (
        <label className="focus-card__weight">
          <span className="focus-card__weight-label">Peso (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={weightKg}
            onChange={(e) => onWeightChange(e.target.value)}
          />
        </label>
      )}
    </div>
  )
}
