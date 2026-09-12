import { useEffect, useRef, useState } from 'react'
import { NotebookPen, RotateCcw } from 'lucide-react'

export function ProgressBar({ percent, onReset, onRecordSession, canRecord }) {
  const [justCompleted, setJustCompleted] = useState(false)
  const prevPercent = useRef(percent)

  // Solo al cruzar a 100, no cada render con el día ya completo.
  useEffect(() => {
    if (prevPercent.current < 100 && percent >= 100) {
      setJustCompleted(true)
    }
    prevPercent.current = percent
  }, [percent])

  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div
          className={justCompleted ? 'progress-bar__fill is-complete' : 'progress-bar__fill'}
          style={{ width: `${percent}%` }}
          onAnimationEnd={() => setJustCompleted(false)}
        />
      </div>
      <div className="progress-bar__footer">
        <span className="progress-bar__percent">{percent}% completado</span>
        <div className="progress-bar__actions">
          {canRecord && (
            <button type="button" className="progress-bar__record" onClick={onRecordSession}>
              <NotebookPen size={16} />
              Registrar sesión
            </button>
          )}
          <button type="button" className="progress-bar__reset" onClick={onReset}>
            <RotateCcw size={16} />
            Reiniciar día
          </button>
        </div>
      </div>
    </div>
  )
}
