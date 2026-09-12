import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, Download, Bot, RefreshCw } from 'lucide-react'
import { AuthButton } from './AuthButton'
import { WelcomeTour } from './WelcomeTour'
import { hasSeenWelcomeTour } from '../utils/profile'
import { downloadRoutineTemplate } from '../utils/routineTemplate'

export function FileUpload({ onFile, loading, error, user, onSignOut, onConnectAi, onRefresh }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isFirstRun, setIsFirstRun] = useState(false)
  // Contador (no booleano): cada click re-monta WelcomeTour con un key
  // nuevo, reseteando su estado interno de "terminado".
  const [replayCount, setReplayCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    hasSeenWelcomeTour(user.id).then((seen) => {
      if (!seen) setIsFirstRun(true)
    })
  }, [user?.id])

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <div className="upload-screen">
      <div className="upload-screen__auth">
        <AuthButton user={user} onSignOut={onSignOut} />
      </div>

      <div className="upload-screen__icon">
        <FileSpreadsheet size={40} />
      </div>
      <h1 className="upload-screen__title">Mi Rutina</h1>
      <p className="upload-screen__subtitle">Elegí cómo querés empezar a seguir tu rutina.</p>

      <button type="button" className="upload-screen__refresh" onClick={handleRefresh} disabled={refreshing}>
        <RefreshCw size={14} className={refreshing ? 'is-spinning' : ''} />
        <span>{refreshing ? 'Buscando…' : 'Ya la armé, buscar mi rutina'}</span>
      </button>

      <div className="upload-options">
        <div className="upload-option" id="upload-option-excel">
          <div className="upload-option__header">
            <UploadCloud size={22} className="upload-option__icon" />
            <span className="upload-option__title">Subí tu Excel</span>
          </div>
          <p className="upload-option__body">¿Ya la tenés armada en una planilla? Subila tal cual está.</p>
          <div
            className={`upload-dropzone ${dragOver ? 'is-dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <span>Arrastrá tu archivo .xlsx acá</span>
            <span className="upload-dropzone__or">o tocá para elegirlo</span>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => handleFiles(e.target.files)} />
          {loading && <p className="upload-screen__status">Leyendo archivo…</p>}
          {error && <p className="upload-screen__error">{error}</p>}
        </div>

        <div className="upload-option" id="upload-option-template">
          <div className="upload-option__header">
            <Download size={22} className="upload-option__icon" />
            <span className="upload-option__title">Descargá una plantilla</span>
          </div>
          <p className="upload-option__body">
            Bajá un Excel con el formato correcto y un ejemplo ya completado para guiarte.
          </p>
          <button type="button" className="upload-option__action" onClick={downloadRoutineTemplate}>
            Descargar plantilla
          </button>
        </div>

        <div className="upload-option" id="upload-option-ai">
          <div className="upload-option__header">
            <Bot size={22} className="upload-option__icon" />
            <span className="upload-option__title">Armala con tu IA</span>
          </div>
          <p className="upload-option__body">
            Conectá Claude, ChatGPT o el asistente que uses y pedile que arme tu rutina por vos.
          </p>
          <button type="button" className="upload-option__action" onClick={onConnectAi}>
            Conectar IA
          </button>
        </div>
      </div>

      <button type="button" className="upload-screen__tutorial-link" onClick={() => setReplayCount((c) => c + 1)}>
        Ver tutorial de nuevo
      </button>

      <WelcomeTour
        key={`tour-${replayCount}`}
        userId={user?.id}
        run={isFirstRun || replayCount > 0}
        shouldMark={isFirstRun && replayCount === 0}
      />
    </div>
  )
}
