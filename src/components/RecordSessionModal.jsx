import { useState } from 'react'
import { X } from 'lucide-react'

/**
 * Solo "Guardar" registra la sesión. Cerrar por la X o por afuera del
 * modal es un cancelar real — no guarda nada, ver docs/etapa-9-analisis.md.
 */
export function RecordSessionModal({ open, onClose, onSubmit }) {
  const [notes, setNotes] = useState('')

  if (!open) return null

  const handleCancel = () => {
    setNotes('')
    onClose()
  }

  const handleSave = () => {
    onSubmit(notes.trim() || null)
    setNotes('')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Registrar sesión</h3>
          <button type="button" className="modal__close" onClick={handleCancel} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <label className="modal__field">
          <span className="modal__field-label">¿Cómo te sentiste? (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas de la sesión..."
            rows={4}
            autoFocus
          />
        </label>

        <button type="button" className="modal__save" onClick={handleSave}>
          Guardar
        </button>
      </div>
    </div>
  )
}
