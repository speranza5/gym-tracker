import { NotebookPen, RotateCcw } from 'lucide-react'

export function ProgressBar({ percent, onReset, onRecordSession, canRecord }) {
  return (
    <div className="progress-bar">
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
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
