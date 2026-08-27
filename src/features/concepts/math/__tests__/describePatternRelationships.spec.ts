import { describe, expect, it, vi } from 'vitest'

import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { describePatternSelectionRelationships } from '@/features/concepts/math/describePatternSelectionRelationships'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { qtrModes } from '@/features/vtg/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import type { VtgCellReference, VtgPatternLabel, VtgRuleNumber } from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import { getVtgBeats } from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const expectedLabelsByRow = {
  1: ['TS / TS', 'SO / SO', 'TS / TS', 'SO / SO', 'TS / SO', 'SO / TS'],
  2: ['TO / TO', 'SS / SS', 'TO / TO', 'SS / SS', 'TO / SS', 'SS / TO'],
  3: ['TS / TS', 'SO / SO', 'TS / TS', 'SO / SO', 'TS / SO', 'SO / TS'],
  4: ['TO / TO', 'SS / SS', 'TO / TO', 'SS / SS', 'TO / SS', 'SS / TO'],
  5: ['TS / TO', 'SO / SS', 'TS / TO', 'SO / SS', 'TS / SS', 'SO / TO'],
  6: ['TO / TS', 'SS / SO', 'TO / TS', 'SS / SO', 'TO / SO', 'SS / TS'],
} as const satisfies Readonly<Record<VtgRuleNumber, readonly VtgPatternLabel[]>>

const expectedDescription = (label: VtgPatternLabel): string => {
  const timingDescriptions = { T: 'Together', S: 'Split', Q: 'Quarter' } as const
  const directionDescriptions = { S: 'Same', O: 'Opposite' } as const
  const [hands, props] = label.split(' / ')
  if (!hands || !props) throw new Error(`Invalid expected relationship label: ${label}`)

  return `Hands: ${timingDescriptions[hands[0] as keyof typeof timingDescriptions]} / ${directionDescriptions[hands[1] as keyof typeof directionDescriptions]}\nProps: ${timingDescriptions[props[0] as keyof typeof timingDescriptions]} / ${directionDescriptions[props[1] as keyof typeof directionDescriptions]}`
}

describe('describePatternRelationships', () => {
  it('warns and returns an obvious label when classification fails', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Missing VTG animation')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(describePatternRelationships({ ...animation, props: [] })).toMatchObject({
      label: 'XX / XX',
      description: expect.stringContaining('Pattern relationship error:'),
    })
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })

  it('derives even-ratio labels from local path phase without changing 1:3', () => {
    expect(
      describePatternSelectionRelationships({ reference: '2-1', speedRatio: '1:3' }).label,
    ).toBe('TO / TO')
    expect(
      describePatternSelectionRelationships({
        reference: '1-2',
        speedRatio: '1:2',
        orientation: -90,
      }).label,
    ).toBe('TO / TO')
    expect(
      describePatternSelectionRelationships({
        reference: '1-2',
        speedRatio: '1:4',
        orientation: -90,
      }).label,
    ).toBe('TO / TO')
  })

  it('keeps every VTG relationship invariant across playback-only controls', () => {
    const mismatches: string[] = []

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${row}-${column}`
        const expected = expectedLabelsByRow[row][column - 1]
        if (!expected) throw new Error(`Missing expected label for ${reference}`)

        for (const beat of getVtgBeats('1:3')) {
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

  it.each([
    [45, 0],
    [0, -45],
  ] as const)('ignores hidden prop rotation alignment %s/%s', (leftOffset, rightOffset) => {
    const selection = { reference: '1-1', speedRatio: '2:3' } as const

    expect(
      describePatternSelectionRelationships({
        ...selection,
        propRotationOffsets: [leftOffset, rightOffset],
      }),
    ).toEqual(describePatternSelectionRelationships(selection))
  })

  it('classifies a retained half-turn prop rotation', () => {
    expect(
      describePatternSelectionRelationships({
        reference: '1-1',
        speedRatio: '2:3',
        propRotationOffsets: [180, 0],
      }).label,
    ).toBe('TS / SS')
  })

  it.each([
    ['1-1', [-90, 0], 'TS / QS'],
    ['2-1', [90, 0], 'TO / QO'],
  ] as const)(
    'keeps retained prop rotation relationships across cell %s',
    (reference, propRotationOffsets, expected) => {
      expect(
        describePatternSelectionRelationships({
          reference,
          speedRatio: '1:3',
          propRotationOffsets,
        }).label,
      ).toBe(expected)
    },
  )

  it('keeps a retained rotation relationship after selecting cell 1-2 at beat 1.5', () => {
    const selection = {
      reference: '1-2',
      speedRatio: '1:3',
      beat: 1.5,
      propRotationOffsets: [-90, 0],
    } as const
    const animation = createDefaultVtgAnimation(selection)
    if (!animation) throw new Error('Missing rotated VTG animation')
    const match = findVtgPatternMatch(animation)
    if (!match) throw new Error('Rotated VTG animation did not match')

    expect(describePatternSelectionRelationships(selection).label).toBe('SO / QO')
    expect(describePatternSelectionRelationships(match).label).toBe('SO / QO')
  })

  it('keeps retained quarter-turn relationships stable across every standard cell and half-beat', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${row}-${column}`
        for (const beat of getVtgBeats('1:3')) {
          for (const propRotationOffsets of [
            [-90, 0],
            [90, 0],
          ] as const) {
            const base = describePatternSelectionRelationships({ reference, speedRatio: '1:3' })
            const rotated = describePatternSelectionRelationships({
              reference,
              speedRatio: '1:3',
              beat,
              propRotationOffsets,
            })
            expect(rotated.hands).toEqual(base.hands)
            expect(rotated.props).toEqual({ ...base.props, timing: 'Q' })
          }
        }
      }
    }
  })

  it.each(['1:2', '1:4'] as const)(
    'transposes the relationship matrix at rotated %s orientations',
    (speedRatio) => {
      for (const orientation of [-90, 90] as const) {
        for (const row of ruleNumbers) {
          for (const column of ruleNumbers) {
            const reference: VtgCellReference = `${row}-${column}`
            const expected = expectedLabelsByRow[column][row - 1]
            if (!expected) throw new Error(`Missing transposed label for ${reference}`)

            expect(
              describePatternSelectionRelationships({ reference, speedRatio, orientation }).label,
            ).toBe(expected)
          }
        }
      }
    },
  )

  it.each(['1:2', '1:4'] as const)(
    'keeps the established relationship matrix at the 180-degree %s orientation',
    (speedRatio) => {
      for (const row of ruleNumbers) {
        for (const column of ruleNumbers) {
          const reference: VtgCellReference = `${row}-${column}`
          const expected = expectedLabelsByRow[row][column - 1]
          if (!expected) throw new Error(`Missing established label for ${reference}`)

          expect(
            describePatternSelectionRelationships({ reference, speedRatio, orientation: 180 })
              .label,
          ).toBe(expected)
        }
      }
    },
  )

  it('keeps every Qtr relationship invariant across playback-only controls', () => {
    const mismatches: string[] = []

    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${row}-${column}`
        for (const quarters of qtrModes) {
          const expected = describePatternSelectionRelationships({
            reference,
            speedRatio: '1:3',
            quarters,
          }).label
          for (const beat of getVtgBeats('1:3')) {
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
        const reference: VtgCellReference = `${row}-${column}`
        const establishedLabel = expectedLabelsByRow[row][column - 1]
        if (!establishedLabel) throw new Error(`Missing expected label for ${reference}`)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            const orientations =
              speedRatio === '1:2' || speedRatio === '1:4'
                ? ([-90, 0, 90, 180] as const)
                : ([0] as const)
            for (const orientation of orientations) {
              for (const swapProps of booleanOptions) {
                for (const reversePlane of booleanOptions) {
                  const animation = createDefaultVtgAnimation({
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    orientation,
                  })
                  if (!animation) throw new Error(`Missing VTG animation for ${reference}`)

                  const quarterTurn = orientation === -90 || orientation === 90
                  const expectedOrientationLabel = quarterTurn
                    ? expectedLabelsByRow[column][row - 1]
                    : establishedLabel
                  if (!expectedOrientationLabel) {
                    throw new Error(`Missing rotated label for ${reference}`)
                  }
                  expect(
                    describePatternRelationships(animation, quarterTurn ? 'source' : 'destination'),
                  ).toMatchObject({
                    label: expectedOrientationLabel,
                    description: expectedDescription(expectedOrientationLabel),
                  })
                }
              }
            }
          }
        }
      }
    }
  })

  it('derives relative Qtr timing while preserving every direction comparison', () => {
    for (const row of ruleNumbers) {
      for (const column of ruleNumbers) {
        const reference: VtgCellReference = `${row}-${column}`
        const establishedLabel = expectedLabelsByRow[row][column - 1]
        if (!establishedLabel) throw new Error(`Missing expected label for ${reference}`)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            const orientations =
              speedRatio === '1:2' || speedRatio === '1:4'
                ? ([-90, 0, 90, 180] as const)
                : ([0] as const)

            for (const orientation of orientations) {
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
                      orientation,
                    })
                    if (!animation) throw new Error(`Missing Qtr animation for ${reference}`)

                    const quarterTurn = orientation === -90 || orientation === 90
                    const expectedOrientationLabel = quarterTurn
                      ? expectedLabelsByRow[column][row - 1]
                      : establishedLabel
                    if (!expectedOrientationLabel) {
                      throw new Error(`Missing rotated Qtr label for ${reference}`)
                    }
                    const expectedLabel = describePatternSelectionRelationships({
                      reference,
                      speedRatio,
                      isAnti,
                      swapProps,
                      reversePlane,
                      quarters,
                      orientation,
                    }).label
                    if (expectedLabel === 'XX / XX') {
                      throw new Error(`Missing relative Qtr label for ${reference}`)
                    }
                    expect(
                      describePatternRelationships(
                        animation,
                        quarterTurn ? 'source' : 'destination',
                      ),
                    ).toMatchObject({
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
    }
  })
})
