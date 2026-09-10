// xlsx se carga de forma diferida, mismo criterio que excelParser.js —
// es pesado y solo hace falta cuando alguien realmente pide la plantilla.

const HEADERS = ['Bloque', 'Ejercicio', 'Series', 'Reps/Tiempo', 'Descripción']

const DIA_1 = [
  HEADERS,
  ['Entrada en calor', 'Trote suave', '1', '5 min', 'Ritmo cómodo.'],
  ['Tren Superior', 'Press banca', '4', '10 reps', 'Bajar controlado, no rebotar en el pecho.'],
  ['Tren Superior', 'Remo con barra', '4', '10 reps', ''],
]

const DIA_2 = [
  HEADERS,
  ['Tren Inferior', 'Sentadilla', '4', '12 reps', 'Rodillas alineadas con los pies.'],
  ['Tren Inferior', 'Zancadas', '3', '10 reps c/pierna', ''],
]

/**
 * Genera y descarga una plantilla .xlsx con contenido de ejemplo ya
 * completado (Etapa 13) — una hoja por día, mismos headers que reconoce
 * excelParser.js, para que se pueda subir tal cual sin editar.
 */
export async function downloadRoutineTemplate() {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(DIA_1), 'Día 1')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(DIA_2), 'Día 2')

  XLSX.writeFile(wb, 'plantilla-gym-tracker.xlsx')
}
