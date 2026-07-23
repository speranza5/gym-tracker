import { RotateCcw } from 'lucide-react'

export function ProgressBar({ percent, onReset }) {
  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-bar__footer">
        <span className="progress-bar__percent">{percent}% completado</span>
        <button type="button" className="progress-bar__reset" onClick={onReset}>
          <RotateCcw size={16} />
          Reiniciar día
        </button>
      </div>
    </div>
  )
}
