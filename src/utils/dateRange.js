/**
 * Cálculo de límites de período (semana/mes/año) para la pantalla de
 * estadísticas (Etapa 10). Puro — sin red, sin React — para poder
 * testearlo sin mockear nada. Alineado a calendario (semana lunes a
 * domingo, mes 1º a fin de mes, año ene-dic), hora local del
 * dispositivo, mismo criterio que `todayStr()` en storage.js.
 */

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = domingo … 6 = sábado
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  return d
}

const SHORT_MONTH = new Intl.DateTimeFormat('es-AR', { month: 'short' })
const LONG_MONTH_YEAR = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatWeekLabel(start, end) {
  const startMonth = SHORT_MONTH.format(start)
  const endMonth = SHORT_MONTH.format(end)
  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`
}

/**
 * @param {'week'|'month'|'year'} granularity
 * @param {number} offset 0 = período actual, negativo = anterior
 * @param {Date} [referenceDate] solo para tests — por defecto, ahora
 * @returns {{start: string, end: string, label: string}} fechas en
 *   formato 'YYYY-MM-DD', comparables lexicográficamente igual que
 *   history.date/progress.date
 */
export function getPeriodRange(granularity, offset, referenceDate = new Date()) {
  if (granularity === 'week') {
    const start = startOfWeek(referenceDate)
    start.setDate(start.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { start: toDateStr(start), end: toDateStr(end), label: formatWeekLabel(start, end) }
  }

  if (granularity === 'month') {
    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth() + offset
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return { start: toDateStr(start), end: toDateStr(end), label: capitalize(LONG_MONTH_YEAR.format(start)) }
  }

  if (granularity === 'year') {
    const year = referenceDate.getFullYear() + offset
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    return { start: toDateStr(start), end: toDateStr(end), label: String(year) }
  }

  throw new Error(`Granularidad desconocida: ${granularity}`)
}
