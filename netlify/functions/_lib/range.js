import { HttpError } from './http.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_DAYS = 30

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

function isRealDate(value) {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/**
 * Lee ?from=&to= (fechas YYYY-MM-DD) de la URL. Sin params, default de
 * los últimos 30 días. Tira 400 INVALID_RANGE si el formato no es fecha
 * real o si from > to.
 */
export function parseRange(url) {
  const params = new URL(url).searchParams
  let { from, to } = { from: params.get('from'), to: params.get('to') }

  if (from == null && to == null) {
    const end = new Date()
    const start = new Date(end.getTime() - (DEFAULT_DAYS - 1) * 86400000)
    return { from: toISODate(start), to: toISODate(end) }
  }

  // Rango parcial (solo uno de los dos) no se completa con defaults: si
  // se pide un rango, se piden las dos puntas.
  if (!isRealDate(from) || !isRealDate(to)) {
    throw new HttpError(
      400,
      'INVALID_RANGE',
      'El rango debe ser dos fechas YYYY-MM-DD válidas (?from=&to=), o nada (últimos 30 días).'
    )
  }
  if (from > to) {
    throw new HttpError(400, 'INVALID_RANGE', '"from" no puede ser posterior a "to".')
  }
  return { from, to }
}
