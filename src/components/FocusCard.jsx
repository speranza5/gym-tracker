import { getBlockColor } from '../utils/blockColors'

export function FocusCard({ exercise }) {
  const color = getBlockColor(exercise.block)
  const meta = [exercise.series, exercise.repsTime].filter(Boolean).join(' · ')

  return (
    <div className="focus-card" style={{ '--block-color': color }}>
      <span className="focus-card__block">{exercise.block}</span>
      <h2 className="focus-card__name">{exercise.name}</h2>
      {meta && <span className="focus-card__meta">{meta}</span>}
      {exercise.description && <p className="focus-card__description">{exercise.description}</p>}
    </div>
  )
}
