import { describe, expect, it } from 'vitest'

import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import type {
  VtgCellReference,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const
const implementedSpeedRatios = ['1:1', '1:3'] as const satisfies readonly VtgSpeedRatio[]

const buildPattern = (reference: VtgCellReference, speedRatio: VtgSpeedRatio, isAnti = false) => {
  const selection: VtgPatternSelection = {
    reference,
    speedRatio,
    isAnti,
  }

  return buildVtgPattern(selection)
}

const createReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

describe('VTG column patterns', () => {
  it.each(implementedSpeedRatios)(
    'shares each column starting frame across every %s row',
    (speedRatio) => {
      for (const column of ruleNumbers) {
        const topPattern = buildPattern(createReference(column, 6), speedRatio)
        const topStarts = topPattern?.props.map((prop) => prop.anim[0])

        for (const row of ruleNumbers) {
          const pattern = buildPattern(createReference(column, row), speedRatio)
          expect(pattern).toBeDefined()
          expect(pattern?.props.map((prop) => prop.anim[0])).toEqual(topStarts)
        }
      }
    },
  )

  it.each(implementedSpeedRatios)(
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

  it('keeps 1:5 unsupported until its ratio tables are defined', () => {
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        expect(buildPattern(createReference(column, row), '1:5')).toBeUndefined()
      }
    }
  })
})
