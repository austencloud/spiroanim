import { describe, expect, it } from 'vitest'

import { getVtgPatternDefinition } from '@/features/vtg/data/vtgPatternCatalog'
import type { VtgCellReference, VtgPatternSelection, VtgRuleNumber } from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const

const buildPattern = (reference: VtgCellReference, isAnti = false) => {
  const selection: VtgPatternSelection = {
    reference,
    speedRatio: '1:1',
    isAnti,
  }

  return getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.(selection)
}

const createReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

describe('VTG column patterns', () => {
  it('shares each column starting frame across every row', () => {
    for (const column of ruleNumbers) {
      const topPattern = buildPattern(createReference(column, 6))
      const topStarts = topPattern?.props.map((prop) => prop.anim[0])

      for (const row of ruleNumbers) {
        const pattern = buildPattern(createReference(column, row))
        expect(pattern).toBeDefined()
        expect(pattern?.props.map((prop) => prop.anim[0])).toEqual(topStarts)
      }
    }
  })

  it('supports both variants in row 5 and keeps other lower cells on Spin', () => {
    for (const column of [5, 6] as const) {
      const rowFiveReference = createReference(column, 5)
      expect(buildPattern(rowFiveReference, true)).toBeDefined()
      expect(buildPattern(rowFiveReference, true)).not.toEqual(
        buildPattern(rowFiveReference, false),
      )

      for (const row of [1, 2, 3, 4] as const) {
        const reference = createReference(column, row)
        expect(buildPattern(reference, true)).toEqual(buildPattern(reference, false))
      }
    }
  })
})
