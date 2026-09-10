import { useId, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

const formatDateLong = (isoString) =>
  new Date(isoString).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="exercise-progress__tooltip">
      <strong>{point.weightKg} kg</strong>
      <span>{formatDateLong(point.recordedAt)}</span>
    </div>
  )
}

function EndLabelDot(props) {
  const { cx, cy, index, dataLength, payload } = props
  const isLast = index === dataLength - 1
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} />
      {isLast && (
        <text x={cx} y={cy - 14} textAnchor="middle" fill="var(--text)" fontSize={13} fontWeight={700}>
          {payload.weightKg} kg
        </text>
      )}
    </g>
  )
}

/**
 * Gráfico de progresión de peso para un ejercicio elegido (Etapa 11).
 * Ver spec visual completo en docs/etapa-11-analisis.md.
 */
export function ExerciseProgressChart({ exerciseName, series }) {
  const [showTable, setShowTable] = useState(false)
  const listId = useId()

  if (series.length === 0) {
    return (
      <section className="exercise-progress">
        <h4 className="exercise-progress__title">Progresión: {exerciseName}</h4>
        <p className="stats-view__empty-inline">Sin datos de peso para este ejercicio.</p>
      </section>
    )
  }

  if (series.length === 1) {
    const [point] = series
    return (
      <section className="exercise-progress">
        <h4 className="exercise-progress__title">Progresión: {exerciseName}</h4>
        <p className="exercise-progress__single">
          <strong>{point.weightKg} kg</strong> el {formatDateLong(point.recordedAt)}
        </p>
        <p className="stats-view__empty-inline">Registrá otra sesión para ver una tendencia.</p>
      </section>
    )
  }

  return (
    <section className="exercise-progress">
      <h4 className="exercise-progress__title">Progresión: {exerciseName}</h4>

      <div className="exercise-progress__chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series} margin={{ top: 24, right: 28, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis
              dataKey="recordedAt"
              tickFormatter={formatDate}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={32}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={(props) => (
                <EndLabelDot key={props.index} {...props} dataLength={series.length} />
              )}
              activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        className="exercise-progress__toggle"
        aria-expanded={showTable}
        aria-controls={listId}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? 'Ocultar lista' : 'Ver como lista'}
      </button>

      {showTable && (
        <ul id={listId} className="exercise-progress__list">
          {series
            .slice()
            .reverse()
            .map((point) => (
              <li key={point.recordedAt} className="exercise-progress__list-item">
                <span>{formatDateLong(point.recordedAt)}</span>
                <strong>{point.weightKg} kg</strong>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
