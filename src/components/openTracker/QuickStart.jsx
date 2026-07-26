import { useState } from 'react'
import { ChevronLeft, Copy, Check } from 'lucide-react'

function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
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
        <code>{code}</code>
      </pre>
    </div>
  )
}

const SAMPLE_ROUTINE = {
  fileName: 'mi-rutina.xlsx',
  days: [
    {
      id: 'd0',
      name: 'Día 1',
      exercises: [{ id: 'd0-e1', name: 'Sentadilla', block: 'Tren inferior', series: '4', repsTime: '8' }],
    },
  ],
}

export function QuickStart({ baseUrl, apiKey, onBack }) {
  const key = apiKey || 'YOUR_API_KEY'
  const routineUrl = `${baseUrl}/routine`
  const bodyJson = JSON.stringify(SAMPLE_ROUTINE)

  const curlGet = `curl ${routineUrl} \\\n  -H "Authorization: Bearer ${key}"`

  const curlPut = `curl -X PUT ${routineUrl} \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyJson}'`

  const fetchGet = `const res = await fetch("${routineUrl}", {\n  headers: { Authorization: "Bearer ${key}" },\n});\nconst routine = await res.json();`

  const fetchPut = `const res = await fetch("${routineUrl}", {\n  method: "PUT",\n  headers: {\n    Authorization: "Bearer ${key}",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${JSON.stringify(SAMPLE_ROUTINE, null, 2)}),\n});\nconst routine = await res.json();`

  return (
    <div className="open-tracker">
      <header className="open-tracker__header">
        <button type="button" className="open-tracker__back" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <span className="open-tracker__title">Quick Start</span>
      </header>

      <main className="open-tracker__content">
        <p className="quick-start__intro">
          Ejemplos listos para copiar, ya con tu Base URL y tu API Key.
        </p>

        <h3 className="quick-start__section-title">cURL</h3>
        <CodeBlock title="Obtener la rutina" code={curlGet} />
        <CodeBlock title="Reemplazar la rutina" code={curlPut} />

        <h3 className="quick-start__section-title">JavaScript (fetch)</h3>
        <CodeBlock title="Obtener la rutina" code={fetchGet} />
        <CodeBlock title="Reemplazar la rutina" code={fetchPut} />
      </main>
    </div>
  )
}
