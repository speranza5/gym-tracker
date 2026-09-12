import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertValidRoutine,
  fromRoutineRow,
  normalizeExerciseName,
  normalizeRoutine,
  RoutineValidationError,
  summarizeRoutine,
  toRoutineRow,
} from './routine.js'

function rutinaValida(overrides = {}) {
  return {
    fileName: 'rutina.xlsx',
    days: [
      {
        id: 'd1',
        name: 'Lunes',
        exercises: [
          { id: 'e1', name: 'Press banca', block: 'Pecho', series: '4', repsTime: '8', description: '' },
          { id: 'e2', name: 'Sentadilla', block: '', series: '4', repsTime: '10', description: '' },
        ],
      },
    ],
    ...overrides,
  }
}

describe('assertValidRoutine', () => {
  it('acepta una rutina válida sin tirar', () => {
    assert.doesNotThrow(() => assertValidRoutine(rutinaValida()))
  })

  it('rechaza days vacío o ausente', () => {
    assert.throws(() => assertValidRoutine(rutinaValida({ days: [] })), RoutineValidationError)
    assert.throws(() => assertValidRoutine({ fileName: 'x' }), RoutineValidationError)
  })

  it('rechaza ids y nombres en blanco (incluido solo-espacios)', () => {
    const sinNombre = rutinaValida()
    sinNombre.days[0].exercises[0].name = '   '
    assert.throws(() => assertValidRoutine(sinNombre), RoutineValidationError)
  })

  it('el error lleva el detalle en issues', () => {
    try {
      assertValidRoutine({ fileName: 'x' })
      assert.fail('tendría que haber tirado')
    } catch (e) {
      assert.ok(e instanceof RoutineValidationError)
      assert.ok(e.issues.length > 0)
    }
  })
})

describe('normalizeRoutine', () => {
  it('recorta y coercea textos libres (null → "", número → String)', () => {
    const out = normalizeRoutine(
      rutinaValida({
        fileName: null,
        days: [
          {
            id: 'd1',
            name: '  Lunes  ',
            exercises: [
              { id: 'e1', name: 'Press', block: null, series: 4, repsTime: undefined, description: null },
            ],
          },
        ],
      })
    )
    assert.equal(out.fileName, null)
    assert.equal(out.days[0].name, 'Lunes')
    assert.equal(out.days[0].exercises[0].block, '')
    assert.equal(out.days[0].exercises[0].series, '4')
    assert.equal(out.days[0].exercises[0].repsTime, '')
  })

  it('tira lo mismo que assert con input inválido', () => {
    assert.throws(() => normalizeRoutine(rutinaValida({ days: [] })), RoutineValidationError)
  })
})

describe('normalizeExerciseName', () => {
  it('recorta y pasa a minúsculas', () => {
    assert.equal(normalizeExerciseName('  Press Banca '), 'press banca')
  })

  it('null/undefined → ""', () => {
    assert.equal(normalizeExerciseName(null), '')
    assert.equal(normalizeExerciseName(undefined), '')
  })
})

describe('summarizeRoutine', () => {
  it('cuenta días y ejercicios, con detalle por día', () => {
    const out = summarizeRoutine({ ...rutinaValida(), updatedAt: '2026-01-01' })
    assert.equal(out.dayCount, 1)
    assert.equal(out.exerciseCount, 2)
    assert.deepEqual(out.days, [{ id: 'd1', name: 'Lunes', exerciseCount: 2 }])
    assert.equal(out.updatedAt, '2026-01-01')
  })

  it('ejercicios sin block van al bucket null y la suma coincide con el total', () => {
    const out = summarizeRoutine(rutinaValida())
    const pecho = out.blocks.find((b) => b.name === 'Pecho')
    const sinBloque = out.blocks.find((b) => b.name === null)
    assert.equal(pecho.exerciseCount, 1)
    assert.equal(sinBloque.exerciseCount, 1)
    assert.equal(
      out.blocks.reduce((acc, b) => acc + b.exerciseCount, 0),
      out.exerciseCount
    )
  })

  it('sin días devuelve ceros, no falla', () => {
    const out = summarizeRoutine({ fileName: null, days: [] })
    assert.equal(out.dayCount, 0)
    assert.equal(out.exerciseCount, 0)
    assert.deepEqual(out.blocks, [])
    assert.equal(out.updatedAt, null)
  })
})

describe('toRoutineRow / fromRoutineRow', () => {
  it('ida y vuelta preservan fileName y days', () => {
    const routine = rutinaValida()
    const row = toRoutineRow('user-1', routine)
    assert.equal(row.user_id, 'user-1')
    assert.equal(row.file_name, 'rutina.xlsx')
    assert.ok(typeof row.updated_at === 'string')

    const dto = fromRoutineRow(row)
    assert.equal(dto.fileName, 'rutina.xlsx')
    assert.deepEqual(dto.days, routine.days)
    assert.equal(dto.updatedAt, row.updated_at)
  })

  it('updated_at ausente → updatedAt null', () => {
    assert.equal(fromRoutineRow({ file_name: null, days: [] }).updatedAt, null)
  })
})
