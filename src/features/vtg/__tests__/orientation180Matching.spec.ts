import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatches } from '@/features/vtg/matchVtgAnimation'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatches } from '@/features/vtg/qtr/matchQtrAnimation'
import type {
  QtrPatternSelection,
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { getVtgBeats } from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

const matchesSelection = (
  match: VtgPatternMatch,
  selection: VtgPatternSelection | QtrPatternSelection,
) =>
  match.reference === selection.reference &&
  match.speedRatio === selection.speedRatio &&
  match.isAnti === (selection.isAnti ?? false) &&
  match.swapProps === (selection.swapProps ?? false) &&
  match.reversePlane === (selection.reversePlane ?? false) &&
  (match.orientation ?? 0) === (selection.orientation ?? 0) &&
  (match.beat ?? 1) === (selection.beat ?? 1)

describe('180-degree VTG orientation matching', () => {
  it('retains every exact 1:2 and 1:4 VTG and QTR selection among equivalent matches', () => {
    const missingSelections: string[] = []

    for (const speedRatio of ['1:2', '1:4'] as const) {
      for (const column of ruleNumbers) {
        for (const row of ruleNumbers) {
          const reference: VtgCellReference = `${row}-${column}`
          const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

          for (const isAnti of antiOptions) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                for (const beat of getVtgBeats(speedRatio)) {
                  const selection = {
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    orientation: 180,
                    ...(beat === 1 ? undefined : { beat }),
                  } as const satisfies VtgPatternSelection
                  const animation = createDefaultVtgAnimation(selection)
                  if (!animation) throw new Error(`Missing VTG animation for ${reference}`)
                  if (
                    !findVtgPatternMatches(animation).some((match) =>
                      matchesSelection(match, selection),
                    )
                  ) {
                    missingSelections.push(`VTG ${JSON.stringify(selection)}`)
                  }

                  const qtrSelection = {
                    ...selection,
                    quarters: 1,
                  } as const satisfies QtrPatternSelection
                  const qtrAnimation = createDefaultQtrAnimation(qtrSelection)
                  if (!qtrAnimation) throw new Error(`Missing QTR animation for ${reference}`)
                  if (
                    !findQtrPatternMatches(qtrAnimation).some((match) =>
                      matchesSelection(match, qtrSelection),
                    )
                  ) {
                    missingSelections.push(`QTR ${JSON.stringify(qtrSelection)}`)
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(missingSelections).toEqual([])
  }, 30_000)
})
