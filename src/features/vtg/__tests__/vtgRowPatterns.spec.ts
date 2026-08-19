import { describe, expect, it } from 'vitest'

import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgSpeedRatios } from '@/features/vtg/types'
import type {
  VtgCellReference,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const

const buildPattern = (reference: VtgCellReference, speedRatio: VtgSpeedRatio, isAnti = false) => {
  const selection: VtgPatternSelection = {
    reference,
    speedRatio,
    isAnti,
  }

  return buildVtgPattern(selection)
}

const createReference = (row: VtgRuleNumber, column: VtgRuleNumber): VtgCellReference =>
  `${row}-${column}`

describe('VTG row patterns', () => {
  it.each(vtgSpeedRatios)('shares each row starting frame across its %s columns', (speedRatio) => {
    for (const row of ruleNumbers) {
      const sharedStarts = buildPattern(createReference(row, 1), speedRatio)?.props.map(
        (prop) => prop.anim[0],
      )

      for (const column of ruleNumbers) {
        const pattern = buildPattern(createReference(row, column), speedRatio)
        expect(pattern).toBeDefined()
        expect(pattern?.props.map((prop) => prop.anim[0])).toEqual(sharedStarts)
      }
    }
  })

  it.each(vtgSpeedRatios)(
    'supports both variants only in the four special cells for %s',
    (speedRatio) => {
      for (const column of [5, 6] as const) {
        for (const row of [5, 6] as const) {
          const reference = createReference(column, row)
          expect(buildPattern(reference, speedRatio, true)).toBeDefined()
          expect(buildPattern(reference, speedRatio, true)).not.toEqual(
            buildPattern(reference, speedRatio, false),
          )
        }

        for (const row of [1, 2, 3, 4] as const) {
          const reference = createReference(column, row)
          expect(buildPattern(reference, speedRatio, true)).toEqual(
            buildPattern(reference, speedRatio, false),
          )
        }
      }
    },
  )

  it('derives every ratio from 1:3 turns while preserving all other frame data', () => {
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = createReference(column, row)

        for (const isAnti of [false, true]) {
          const base = buildPattern(reference, '1:3', isAnti)
          if (base === undefined) {
            throw new Error(`Missing VTG ratio pattern for ${reference}`)
          }

          for (const speedRatio of vtgSpeedRatios) {
            const denominator = Number(speedRatio.slice(2))
            const pattern = buildPattern(reference, speedRatio, isAnti)
            if (pattern === undefined) throw new Error(`Missing VTG pattern for ${reference}`)

            for (const propIndex of [0, 1] as const) {
              const baseFrame = base.props[propIndex]?.anim[1]
              const frame = pattern.props[propIndex]?.anim[1]
              if (baseFrame === undefined || frame === undefined) {
                throw new Error(`Missing VTG continuation frame for ${reference}`)
              }

              const { turns: baseFrameTurns, ...baseShape } = baseFrame
              const { turns: frameTurns, ...shape } = frame
              const baseTurns = baseFrameTurns ?? base.props[propIndex]?.anim[0]?.turns ?? 0
              const turns = frameTurns ?? pattern.props[propIndex]?.anim[0]?.turns ?? 0
              expect(shape).toEqual(baseShape)
              expect(turns).toBe(((baseTurns + 45) * denominator) / 3 - 45)
            }
          }
        }
      }
    }
  })
})
