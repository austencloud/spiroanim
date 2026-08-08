import { describe, expect, it } from 'vitest'

import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { qtrModes } from '@/features/qtr/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgCellReference, VtgPatternLabel, VtgRuleNumber } from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const expectedLabelsByRow = {
  1: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  2: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  3: ['TS/TS', 'SO/SO', 'TS/TS', 'SO/SO', 'TS/SO', 'SO/TS'],
  4: ['TO/TO', 'SS/SS', 'TO/TO', 'SS/SS', 'TO/SS', 'SS/TO'],
  5: ['TS/TO', 'SO/SS', 'TS/TO', 'SO/SS', 'TS/SS', 'SO/TO'],
  6: ['TO/TS', 'SS/SO', 'TO/TS', 'SS/SO', 'TO/SO', 'SS/TS'],
} as const satisfies Readonly<Record<VtgRuleNumber, readonly VtgPatternLabel[]>>

const expectedDescription = (label: VtgPatternLabel): string => {
  const timingDescriptions = { T: 'Together', S: 'Split', Q: 'Quarter' } as const
  const directionDescriptions = { S: 'Same', O: 'Opposite' } as const
  const [hands, props] = label.split('/')
  if (!hands || !props) throw new Error(`Invalid expected relationship label: ${label}`)

  return `Hands: ${timingDescriptions[hands[0] as keyof typeof timingDescriptions]} / ${directionDescriptions[hands[1] as keyof typeof directionDescriptions]}\nProps: ${timingDescriptions[props[0] as keyof typeof timingDescriptions]} / ${directionDescriptions[props[1] as keyof typeof directionDescriptions]}`
}

describe('describePatternRelationships', () => {
  it('derives every established VTG label and tooltip across supported settings', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const expectedLabel = expectedLabelsByRow[row][column - 1]
        if (!expectedLabel) throw new Error(`Missing expected label for ${reference}`)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                const animation = createDefaultVtgAnimation({
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                })
                if (!animation) throw new Error(`Missing VTG animation for ${reference}`)

                expect(describePatternRelationships(animation)).toMatchObject({
                  label: expectedLabel,
                  description: expectedDescription(expectedLabel),
                })
              }
            }
          }
        }
      }
    }
  })

  it('derives Quarter timing across QTR source settings', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                for (const quarters of qtrModes) {
                  const animation = createDefaultQtrAnimation({
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    quarters,
                  })
                  if (!animation) throw new Error(`Missing Qtr animation for ${reference}`)

                  const relationship = describePatternRelationships(animation)
                  const [hands, props] = relationship.label.split('/')
                  expect(hands?.startsWith('Q')).toBe(true)
                  expect(props?.startsWith('Q')).toBe(true)
                  expect(relationship.description).toBe(expectedDescription(relationship.label))
                }
              }
            }
          }
        }
      }
    }
  })
})
