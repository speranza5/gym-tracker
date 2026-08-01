import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPeriodRange } from '../utils/dateRange'
import { countDistinctDays, topExercises } from '../utils/statsAggregation'
import { pullHistoryInRange, pullSessionsInRange } from '../utils/cloudSync'

const GRANULARITIES = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
]

export function StatsView({ user, onBack }) {
  const [granularity, setGranularity] = useState('week')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [daysCompleted, setDaysCompleted] = useState(0)
  const [topList, setTopList] = useState([])

  const { start, end, label } = getPeriodRange(granularity, offset)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([pullHistoryInRange(user.id, start, end), pullSessionsInRange(user.id, start, end)]).then(
      ([historyRows, sessionRows]) => {
        if (cancelled) return
        setDaysCompleted(countDistinctDays(historyRows))
        setTopList(topExercises(sessionRows, 5))
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [user.id, start, end])

  const handleGranularityChange = (key) => {
    setGranularity(key)
    setOffset(0)
  }

  const isEmpty = !loading && daysCompleted === 0 && topList.length === 0

  return (
    <div className="stats-view">
      <header className="stats-view__header">
        <button type="button" className="stats-view__back" onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <span className="stats-view__title">Estadísticas</span>
      </header>

      <div className="stats-view__period-tabs">
        {GRANULARITIES.map(({ key, label: tabLabel }) => (
          <button
            key={key}
            type="button"
            className={`stats-view__period-tab ${granularity === key ? 'is-active' : ''}`}
            onClick={() => handleGranularityChange(key)}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      <div className="stats-view__nav">
        <button
          type="button"
          className="stats-view__nav-btn"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Período anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="stats-view__period-label">{label}</span>
        <button
          type="button"
          className="stats-view__nav-btn"
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset === 0}
          aria-label="Período siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <main className="stats-view__content">
        {loading ? (
          <p className="stats-view__loading">Cargando…</p>
        ) : isEmpty ? (
          <p className="stats-view__empty">Todavía no registraste sesiones este período.</p>
        ) : (
          <>
            <section className="stats-view__section">
              <h3 className="stats-view__section-title">Consistencia</h3>
              <p className="stats-view__days-count">
                <strong>{daysCompleted}</strong> {daysCompleted === 1 ? 'día entrenado' : 'días entrenados'}
              </p>
            </section>

            <section className="stats-view__section">
              <h3 className="stats-view__section-title">Ejercicios más frecuentes</h3>
              {topList.length === 0 ? (
                <p className="stats-view__empty-inline">Sin sesiones registradas con ejercicios marcados.</p>
              ) : (
                <ol className="stats-view__top-list">
                  {topList.map((item, i) => (
                    <li key={item.name} className="stats-view__top-item">
                      <span className="stats-view__top-rank">{i + 1}</span>
                      <span className="stats-view__top-name">{item.name}</span>
                      <span className="stats-view__top-count">{item.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
