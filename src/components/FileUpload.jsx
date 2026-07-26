import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet } from 'lucide-react'
import { AuthButton } from './AuthButton'

export function FileUpload({ onFile, loading, error, user, authLoading, onSignIn, onSignOut }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  return (
    <div className="upload-screen">
      <div className="upload-screen__auth">
        <AuthButton user={user} loading={authLoading} onSignIn={onSignIn} onSignOut={onSignOut} />
      </div>

      <div className="upload-screen__icon">
        <FileSpreadsheet size={40} />
      </div>
      <h1 className="upload-screen__title">Mi Rutina</h1>
      <p className="upload-screen__subtitle">
        Subí tu planilla Excel (.xlsx) con la rutina para empezar a seguirla.
      </p>

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
        <UploadCloud size={32} />
        <span>Arrastrá tu archivo .xlsx acá</span>
        <span className="upload-dropzone__or">o tocá para elegirlo</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {loading && <p className="upload-screen__status">Leyendo archivo…</p>}
      {error && <p className="upload-screen__error">{error}</p>}
    </div>
  )
}
