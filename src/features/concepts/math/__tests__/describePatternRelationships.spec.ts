import { describe, expect, it } from 'vitest'

import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { describePatternSelectionRelationships } from '@/features/concepts/math/describePatternSelectionRelationships'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { qtrModes } from '@/features/vtg/types'
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

const quarterLabel = (label: VtgPatternLabel): VtgPatternLabel => {
  const [hands, props] = label.split('/')
  if (!hands || !props) throw new Error(`Invalid expected relationship label: ${label}`)
  return `Q${hands[1]}/Q${props[1]}` as VtgPatternLabel
}

describe('describePatternRelationships', () => {
  it('keeps every VTG relationship invariant across playback-only controls', () => {
    const mismatches: string[] = []

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const expected = expectedLabelsByRow[row][column - 1]
        if (!expected) throw new Error(`Missing expected label for ${reference}`)

        for (const beat of [1, 2, 3, 4] as const) {
          for (const transition of booleanOptions) {
            const actual = describePatternSelectionRelationships({
              reference,
              speedRatio: '1:3',
              beat,
              transition,
            }).label
            if (actual !== expected) {
              mismatches.push(`${reference}/${beat}/${transition}: ${expected} -> ${actual}`)
            }
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('keeps every Qtr relationship invariant across playback-only controls', () => {
    const mismatches: string[] = []

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const baseLabel = expectedLabelsByRow[row][column - 1]
        if (!baseLabel) throw new Error(`Missing expected label for ${reference}`)
        const expected = quarterLabel(baseLabel)

        for (const quarters of qtrModes) {
          for (const beat of [1, 2, 3, 4] as const) {
            for (const transition of booleanOptions) {
              const actual = describePatternSelectionRelationships({
                reference,
                speedRatio: '1:3',
                quarters,
                beat,
                transition,
              }).label
              if (actual !== expected) {
                mismatches.push(
                  `${reference}/${quarters}/${beat}/${transition}: ${expected} -> ${actual}`,
                )
              }
            }
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('derives every established VTG label and tooltip across supported settings', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const establishedLabel = expectedLabelsByRow[row][column - 1]
        if (!establishedLabel) throw new Error(`Missing expected label for ${reference}`)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            const baseAnimation = createDefaultVtgAnimation({ reference, speedRatio, isAnti })
            if (!baseAnimation) throw new Error(`Missing VTG animation for ${reference}`)
            const expectedLabel =
              Number(speedRatio.slice(2)) % 2 === 0
                ? describePatternRelationships(baseAnimation).label
                : establishedLabel

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

  it('derives Quarter timing while preserving every direction comparison', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${column}-${row}`
        const establishedLabel = expectedLabelsByRow[row][column - 1]
        if (!establishedLabel) throw new Error(`Missing expected label for ${reference}`)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            const baseAnimation = createDefaultQtrAnimation({
              reference,
              speedRatio,
              isAnti,
              quarters: 1,
            })
            if (!baseAnimation) throw new Error(`Missing Qtr animation for ${reference}`)
            const expectedLabel =
              Number(speedRatio.slice(2)) % 2 === 0
                ? describePatternRelationships(baseAnimation).label
                : quarterLabel(establishedLabel)

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
    }
  })
})
