// Reglas de color por tipo de bloque, para ubicarse rápido de un vistazo.
// Se busca por palabras clave dentro del nombre del bloque (insensible a
// acentos/mayúsculas). Si no matchea ninguna regla conocida, se asigna un
// color estable de una paleta de respaldo según el nombre del bloque.
const CATEGORY_RULES = [
  {
    color: '#f5a623', // calentamiento — cálido
    keywords: ['calentamiento', 'entrada en calor', 'warm up', 'warmup', 'activacion'],
  },
  {
    color: '#4f8ef7', // tren superior — azul
    keywords: ['tren superior', 'superior', 'upper', 'brazos', 'pecho', 'espalda', 'hombro'],
  },
  {
    color: '#b17ee8', // zona media / core — violeta
    keywords: ['zona media', 'core', 'abdomen', 'abdominales', 'medio'],
  },
  {
    color: '#3ecf8e', // tren inferior — verde
    keywords: ['tren inferior', 'inferior', 'piernas', 'lower', 'gluteo', 'cuadriceps'],
  },
  {
    color: '#f76f6f', // cierre / vuelta a la calma — rojo suave
    keywords: ['cierre', 'vuelta a la calma', 'estiramiento', 'cooldown', 'cool down', 'elongacion'],
  },
  {
    color: '#38c6d9', // aeróbico — celeste
    keywords: ['aerobico', 'cardio', 'aerobic'],
  },
]

const FALLBACK_PALETTE = ['#f5a623', '#4f8ef7', '#b17ee8', '#3ecf8e', '#f76f6f', '#38c6d9', '#e0607e', '#9aa0a6']

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getBlockColor(blockName) {
  const normalized = normalize(blockName)

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return rule.color
    }
  }

  const index = hashString(normalized) % FALLBACK_PALETTE.length
  return FALLBACK_PALETTE[index]
}
