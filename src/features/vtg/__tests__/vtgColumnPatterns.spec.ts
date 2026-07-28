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

const createReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const getExpectedOneToFiveTurns = (
  column: VtgRuleNumber,
  row: VtgRuleNumber,
  isAnti: boolean,
): readonly [number, number] => {
  if (row >= 5) {
    if (column >= 5) return isAnti ? [-540, -540] : [360, 360]
    return [360, -540]
  }
  if (column <= 2) return row <= 2 ? [360, 360] : [-540, -540]
  if (column <= 4) return row <= 2 ? [-540, -540] : [360, 360]
  return row <= 2 ? [360, -540] : [-540, 360]
}

describe('VTG column patterns', () => {
  it.each(vtgSpeedRatios)('shares each column starting frame across every %s row', (speedRatio) => {
    for (const column of ruleNumbers) {
      const topPattern = buildPattern(createReference(column, 6), speedRatio)
      const topStarts = topPattern?.props.map((prop) => prop.anim[0])

      for (const row of ruleNumbers) {
        const pattern = buildPattern(createReference(column, row), speedRatio)
        expect(pattern).toBeDefined()
        expect(pattern?.props.map((prop) => prop.anim[0])).toEqual(topStarts)
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

  it('uses the inferred 1:5 turn branches while preserving continuation geometry', () => {
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = createReference(column, row)

        for (const isAnti of [false, true]) {
          const oneToOne = buildPattern(reference, '1:1', isAnti)
          const oneToFive = buildPattern(reference, '1:5', isAnti)
          if (oneToOne === undefined || oneToFive === undefined) {
            throw new Error(`Missing VTG ratio pattern for ${reference}`)
          }

          const actualTurns: number[] = []
          for (const propIndex of [0, 1] as const) {
            const oneToOneFrame = oneToOne.props[propIndex]?.anim[1]
            const oneToFiveFrame = oneToFive.props[propIndex]?.anim[1]
            if (oneToOneFrame === undefined || oneToFiveFrame === undefined) {
              throw new Error(`Missing VTG continuation frame for ${reference}`)
            }

            const { turns: _oneToOneTurns, ...oneToOneShape } = oneToOneFrame
            const { turns: oneToFiveTurns = 0, ...oneToFiveShape } = oneToFiveFrame

            expect(oneToFiveShape).toEqual(oneToOneShape)
            actualTurns.push(oneToFiveTurns)
          }

          expect(actualTurns).toEqual(getExpectedOneToFiveTurns(column, row, isAnti))
        }
      }
    }
  })
})
