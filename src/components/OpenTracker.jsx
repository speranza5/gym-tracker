import { useEffect, useState } from 'react'
import { ChevronLeft, Copy, Check, Plug } from 'lucide-react'
import { getOrCreateApiKey } from '../utils/apiKeys'

export function OpenTracker({ user, onBack }) {
  const [apiKey, setApiKey] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const baseUrl = `${window.location.origin}/api/v1`

  useEffect(() => {
    let cancelled = false
    getOrCreateApiKey(user.id)
      .then((key) => {
        if (!cancelled) setApiKey(key)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo obtener tu API Key. Probá de nuevo en un momento.')
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  const handleCopy = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="open-tracker">
      <header className="open-tracker__header">
        <button type="button" className="open-tracker__back" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <span className="open-tracker__title">Open Tracker</span>
      </header>

      <main className="open-tracker__content">
        <div className="open-tracker__intro">
          <Plug size={28} className="open-tracker__intro-icon" />
          <p className="open-tracker__intro-text">
            Open Tracker te permite conectar agentes e integraciones externas (asistentes de IA,
            scripts, futuras apps) para leer y actualizar tu rutina usando tu propia API Key.
          </p>
        </div>

        <div className="open-tracker__field">
          <span className="open-tracker__label">API Base URL</span>
          <code className="open-tracker__value">{baseUrl}</code>
        </div>

        <div className="open-tracker__field">
          <span className="open-tracker__label">API Key</span>
          <div className="open-tracker__key-row">
            <code className="open-tracker__value open-tracker__value--key">
              {apiKey || (error ? '—' : 'Generando...')}
            </code>
            <button
              type="button"
              className="open-tracker__copy"
              onClick={handleCopy}
              disabled={!apiKey}
              title="Copiar API Key"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {error && <p className="open-tracker__error">{error}</p>}
        </div>
      </main>
    </div>
  )
}
