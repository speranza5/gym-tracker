import { lazy, Suspense, useEffect, useState } from 'react'
import { ChevronLeft, Copy, Check, Plug, BookOpen, FileText, Rocket, Bot } from 'lucide-react'
import { getOrCreateApiKey } from '../utils/apiKeys'
import { QuickStart } from './openTracker/QuickStart'

const Playground = lazy(() => import('./openTracker/Playground'))

const API_REFERENCE_URL = 'https://github.com/speranza5/gym-tracker/blob/main/docs/api.md'

function CopyField({ label, value, placeholder }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="open-tracker__field">
      <span className="open-tracker__label">{label}</span>
      <div className="open-tracker__key-row">
        <code className="open-tracker__value open-tracker__value--key">{value || placeholder}</code>
        <button
          type="button"
          className="open-tracker__copy"
          onClick={handleCopy}
          disabled={!value}
          title={`Copiar ${label}`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  )
}

function ResourceCard({ icon, title, description, onClick }) {
  return (
    <button type="button" className="open-tracker__resource" onClick={onClick}>
      <span className="open-tracker__resource-icon">{icon}</span>
      <span className="open-tracker__resource-body">
        <span className="open-tracker__resource-title">{title}</span>
        <span className="open-tracker__resource-desc">{description}</span>
      </span>
    </button>
  )
}

export function OpenTracker({ user, onBack }) {
  const [apiKey, setApiKey] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState('hub')

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

  if (view === 'quickstart') {
    return <QuickStart baseUrl={baseUrl} apiKey={apiKey} onBack={() => setView('hub')} />
  }

  if (view === 'playground') {
    return (
      <div className="open-tracker open-tracker--playground">
        <header className="open-tracker__header">
          <button type="button" className="open-tracker__back" onClick={() => setView('hub')}>
            <ChevronLeft size={20} />
          </button>
          <span className="open-tracker__title">API Playground</span>
        </header>
        <div className="open-tracker__playground-body">
          <Suspense fallback={<p className="open-tracker__loading">Cargando Playground…</p>}>
            <Playground apiKey={apiKey} />
          </Suspense>
        </div>
      </div>
    )
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

        <section className="open-tracker__section">
          <h3 className="open-tracker__section-title">Credentials</h3>
          <CopyField label="API Base URL" value={baseUrl} />
          <CopyField label="API Key" value={apiKey} placeholder={error ? '—' : 'Generando...'} />
          {error && <p className="open-tracker__error">{error}</p>}
        </section>

        <section className="open-tracker__section">
          <h3 className="open-tracker__section-title">Developer Resources</h3>
          <div className="open-tracker__resources">
            <ResourceCard
              icon={<BookOpen size={18} />}
              title="API Playground"
              description="Explorá y ejecutá la API desde el navegador"
              onClick={() => setView('playground')}
            />
            <ResourceCard
              icon={<FileText size={18} />}
              title="API Reference"
              description="Documentación completa en Markdown"
              onClick={() => window.open(API_REFERENCE_URL, '_blank', 'noopener,noreferrer')}
            />
            <ResourceCard
              icon={<Rocket size={18} />}
              title="Quick Start"
              description="Ejemplos listos para copiar (curl, fetch)"
              onClick={() => setView('quickstart')}
            />
          </div>
        </section>

        <section className="open-tracker__section">
          <h3 className="open-tracker__section-title">Future Integrations</h3>
          <div className="open-tracker__coming-soon">
            <span className="open-tracker__coming-soon-icon">
              <Bot size={20} />
            </span>
            <div>
              <div className="open-tracker__coming-soon-title">MCP Server</div>
              <p className="open-tracker__coming-soon-desc">
                Connect Claude Desktop, Cursor and other MCP-compatible clients.
              </p>
            </div>
            <span className="open-tracker__coming-soon-badge">Coming Soon</span>
          </div>
        </section>
      </main>
    </div>
  )
}
