import { List, Focus } from 'lucide-react'

const OPTIONS = [
  { mode: 'list', label: 'Lista', Icon: List },
  { mode: 'focus', label: 'Foco', Icon: Focus },
]

export function ViewToggle({ mode, onChange }) {
  return (
    <div className="view-toggle" role="tablist">
      {OPTIONS.map(({ mode: optionMode, label, Icon }) => (
        <button
          key={optionMode}
          type="button"
          role="tab"
          aria-selected={mode === optionMode}
          className={`view-toggle__tab ${mode === optionMode ? 'is-active' : ''}`}
          onClick={() => onChange(optionMode)}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  )
}
