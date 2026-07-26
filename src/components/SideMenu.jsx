import { useEffect } from 'react'
import { X, FileSpreadsheet } from 'lucide-react'
import { AuthButton } from './AuthButton'

/**
 * Menú lateral estilo Material con la configuración de la rutina
 * (cuenta y cambio de archivo). Pensado como una lista de ítems para
 * poder sumar secciones nuevas (ej: API key) sin rediseñarlo.
 */
export function SideMenu({ open, onClose, user, authLoading, onSignIn, onSignOut, onChangeFile }) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleChangeFile = () => {
    onChangeFile()
    onClose()
  }

  return (
    <>
      <div
        className={`side-menu-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`side-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="side-menu__header">
          <span className="side-menu__title">Mi Rutina</span>
          <button type="button" className="side-menu__close" onClick={onClose} title="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <div className="side-menu__section">
          <AuthButton user={user} loading={authLoading} onSignIn={onSignIn} onSignOut={onSignOut} />
        </div>

        <div className="side-menu__divider" />

        <button type="button" className="side-menu__item" onClick={handleChangeFile}>
          <FileSpreadsheet size={18} />
          <span>Cambiar archivo</span>
        </button>
      </aside>
    </>
  )
}
