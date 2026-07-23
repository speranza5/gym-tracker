import { ExerciseCard } from './ExerciseCard'
import { getBlockColor } from '../utils/blockColors'

// Agrupa ejercicios consecutivos por bloque, respetando el orden del Excel.
function groupByBlock(exercises) {
  const groups = []
  let current = null
  exercises.forEach((exercise) => {
    if (!current || current.block !== exercise.block) {
      current = { block: exercise.block, items: [] }
      groups.push(current)
    }
    current.items.push(exercise)
  })
  return groups
}

export function ExerciseList({ day, checkedSet, onToggle }) {
  const groups = groupByBlock(day.exercises)

  return (
    <div className="exercise-list">
      {groups.map((group, i) => (
        <section key={`${group.block}-${i}`} className="exercise-list__group">
          <h3 className="exercise-list__block-title" style={{ '--block-color': getBlockColor(group.block) }}>
            {group.block}
          </h3>
          {group.items.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              checked={checkedSet.has(exercise.id)}
              onToggle={() => onToggle(exercise.id)}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
