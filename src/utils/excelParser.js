// xlsx se carga de forma diferida (ver parseWorkoutExcel) para que su peso
// no infle el bundle inicial: la mayoría de las visitas ya tiene los datos
// en localStorage y nunca necesita volver a parsear un archivo.

// Encabezados esperados por campo. Se buscan por coincidencia aproximada,
// no por posición exacta de columna, para tolerar variaciones como
// "Reps" vs "Reps/Tiempo" vs "Repeticiones".
const HEADER_PATTERNS = {
  block: ['bloque', 'seccion', 'section'],
  name: ['ejercicio', 'nombre', 'exercise', 'movimiento'],
  series: ['series', 'serie', 'sets'],
  repsTime: ['reps/tiempo', 'reps', 'repeticiones', 'tiempo', 'reps/time', 'time'],
  description: ['descripcion', 'detalle', 'notas', 'observaciones', 'nota'],
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function matchColumn(headers, patterns) {
  const normalizedHeaders = headers.map(normalize)

  // 1) coincidencia exacta
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (!normalizedHeaders[i]) continue
    if (patterns.some((p) => normalizedHeaders[i] === normalize(p))) return i
  }

  // 2) coincidencia parcial (ej: "Reps/Tiempo" contiene "reps")
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (!normalizedHeaders[i]) continue
    if (patterns.some((p) => normalizedHeaders[i].includes(normalize(p)))) return i
  }

  return -1
}

/**
 * Parsea un archivo Excel con una hoja por día de rutina.
 * Cada hoja debe tener columnas reconocibles como Bloque, Ejercicio,
 * Series, Reps/Tiempo y Descripción (nombres aproximados).
 */
export async function parseWorkoutExcel(file) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const days = []

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    })
    if (!rows.length) return

    const headers = rows[0]
    const colBlock = matchColumn(headers, HEADER_PATTERNS.block)
    const colName = matchColumn(headers, HEADER_PATTERNS.name)
    const colSeries = matchColumn(headers, HEADER_PATTERNS.series)
    const colReps = matchColumn(headers, HEADER_PATTERNS.repsTime)
    const colDesc = matchColumn(headers, HEADER_PATTERNS.description)

    // Sin columna de nombre de ejercicio reconocible, la hoja no es utilizable.
    if (colName === -1) return

    let lastBlock = ''
    const exercises = []

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const name = String(row[colName] ?? '').trim()
      if (!name) continue // fila vacía o separadora

      // El bloque suele venir en celdas combinadas: si está vacío,
      // se hereda el último bloque visto en la hoja.
      const blockRaw = colBlock >= 0 ? String(row[colBlock] ?? '').trim() : ''
      if (blockRaw) lastBlock = blockRaw
      const block = lastBlock || 'General'

      exercises.push({
        id: `d${sheetIndex}-e${r}`,
        block,
        name,
        series: colSeries >= 0 ? String(row[colSeries] ?? '').trim() : '',
        repsTime: colReps >= 0 ? String(row[colReps] ?? '').trim() : '',
        description: colDesc >= 0 ? String(row[colDesc] ?? '').trim() : '',
      })
    }

    if (exercises.length) {
      days.push({
        id: `d${sheetIndex}`,
        name: sheetName,
        exercises,
      })
    }
  })

  if (!days.length) {
    throw new Error(
      'No se encontraron hojas con ejercicios reconocibles. Revisá que cada hoja tenga una columna de "Ejercicio".'
    )
  }

  return days
}
