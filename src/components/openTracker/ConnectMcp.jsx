import { useState } from 'react'
import { ChevronLeft, Copy, Check } from 'lucide-react'

const MCP_SERVER_URL = 'https://gym-tracker-mcp.netlify.app/mcp'

function CopyBlock({ title, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="quick-start__block">
      <div className="quick-start__block-header">
        <span className="quick-start__block-title">{title}</span>
        <button type="button" className="quick-start__copy" onClick={handleCopy} title="Copiar">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="quick-start__code">
        <code>{value}</code>
      </pre>
    </div>
  )
}

export function ConnectMcp({ onBack }) {
  return (
    <div className="open-tracker">
      <header className="open-tracker__header">
        <button type="button" className="open-tracker__back" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <span className="open-tracker__title">Conectar MCP</span>
      </header>

      <main className="open-tracker__content">
        <p className="quick-start__intro">
          Conectá Claude o ChatGPT a tu cuenta de Gym Tracker sin copiar ninguna API Key: al
          conectar, iniciás sesión con la misma cuenta de Google que usás acá, y el asistente
          queda autorizado a leer y actualizar tu rutina.
        </p>

        <CopyBlock title="MCP Server URL" value={MCP_SERVER_URL} />

        <h3 className="quick-start__section-title">Claude (Desktop o claude.ai)</h3>
        <ol className="connect-mcp__steps">
          <li>
            Andá a <strong>Settings → Connectors</strong>.
          </li>
          <li>
            Tocá <strong>Add custom connector</strong> y pegá la URL de arriba.
          </li>
          <li>Claude descubre el login automáticamente — no hace falta ID ni secreto.</li>
          <li>Se abre una pantalla para iniciar sesión con Google y confirmar el acceso.</li>
          <li>
            Activá el conector desde el botón <strong>+</strong> de cualquier conversación.
          </li>
        </ol>
        <p className="connect-mcp__note">
          Disponible en los planes Free, Pro, Max, Team y Enterprise (Free permite un solo
          conector personalizado).
        </p>

        <h3 className="quick-start__section-title">ChatGPT</h3>
        <ol className="connect-mcp__steps">
          <li>
            Andá a <strong>Settings → Connectors → Advanced</strong> y activá{' '}
            <strong>Developer mode</strong> (requiere un plan pago: Plus, Pro, Business,
            Enterprise o Edu).
          </li>
          <li>
            En Connectors, tocá <strong>Create</strong>.
          </li>
          <li>
            Completá <strong>Name</strong> (ej: "Gym Tracker") y pegá la URL de arriba en{' '}
            <strong>MCP Server URL</strong>.
          </li>
          <li>
            En <strong>Authentication</strong> elegí <strong>OAuth</strong>.
          </li>
          <li>
            Confirmá el checkbox de confianza y tocá <strong>Create</strong> — se abre el login
            con Google para autorizar.
          </li>
        </ol>
        <p className="connect-mcp__note">
          OpenAI cambia esta pantalla con frecuencia — si algún nombre no coincide exactamente,
          buscá "Connectors" o "Developer mode" dentro de Settings.
        </p>
      </main>
    </div>
  )
}
