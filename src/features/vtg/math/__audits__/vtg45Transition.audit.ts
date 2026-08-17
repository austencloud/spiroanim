import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import {
  createVtgTransitionQuickSlotAnimationCandidates,
  resolveVtgTransitionQuickSlotAnimations,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getUniqueVtgPatternOrientations } from '@/features/vtg/math/getUniqueVtgPatternOrientations'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import type {
  VtgBeat,
  VtgCellReference,
  VtgRuleNumber,
  VtgSpeedRatio,
  VtgTransitionBeats,
} from '@/features/vtg/types'
import { vtgBeats, vtgTransitionBeats } from '@/features/vtg/types'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const oddRatios = ['1:1', '1:3', '1:5'] as const satisfies readonly VtgSpeedRatio[]
const transitionModes = vtgTransitionBeats.flatMap((transitionBeats) => [
  { transitionBeats, transitionQuad: false, transitionSecond: false },
  { transitionBeats, transitionQuad: true, transitionSecond: false },
  { transitionBeats, transitionQuad: true, transitionSecond: true },
])

interface UnmatchedTransition {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  beat: VtgBeat
  transitionBeats: VtgTransitionBeats
  transitionQuad: boolean
  transitionSecond: boolean
  slot: number
}

describe('VTG 45 transition catalog audit', () => {
  it('resolves every base odd-ratio transition extraction with rotation last', async () => {
    const unmatched: UnmatchedTransition[] = []

    for (const speedRatio of oddRatios) {
      for (const row of ruleNumbers) {
        for (const column of ruleNumbers) {
          const reference: VtgCellReference = `${column}-${row}`
          for (const beat of vtgBeats) {
            for (const mode of transitionModes) {
              const animation = createDefaultVtgAnimation({
                reference,
                speedRatio,
                beat,
                transition: true,
                ...mode,
              })
              if (!animation) continue
              const groups = createVtgTransitionQuickSlotAnimationCandidates(animation)
              if (!groups) throw new Error(`Could not extract ${speedRatio} ${reference}`)

              const result = await resolveVtgTransitionQuickSlotAnimations(
                groups,
                (candidate, rotationFilter) =>
                  findVtgPatternMatch(candidate, undefined, rotationFilter) !== undefined ||
                  findQtrPatternMatch(candidate, undefined, rotationFilter) !== undefined,
              )
              if (result.status === 'matched') continue
              unmatched.push({ reference, speedRatio, beat, ...mode, slot: result.slot })
            }
          }
        }
      }
    }

    const counts = Object.fromEntries(
      [...new Set(unmatched.map(({ speedRatio, slot }) => `${speedRatio} Q${slot}`))].map(
        (key) => [
          key,
          unmatched.filter(({ speedRatio, slot }) => `${speedRatio} Q${slot}` === key).length,
        ],
      ),
    )
    expect(
      unmatched.length,
      `Unmatched transition extractions: ${JSON.stringify(counts)}\nFirst 20:\n${JSON.stringify(unmatched.slice(0, 20), null, 2)}`,
    ).toBe(0)
  })

  it('retains only rotations that add a unique pattern family', () => {
    for (const speedRatio of oddRatios) {
      for (const row of ruleNumbers) {
        for (const column of ruleNumbers) {
          const reference: VtgCellReference = `${column}-${row}`
          for (const shape of ['diamond', 'box'] as const) {
            for (const quarters of [false, true] as const) {
              const selection = {
                reference,
                speedRatio,
                ...(shape === 'box' ? { shape } : undefined),
                ...(quarters ? { quarters: 1 as const } : undefined),
              }
              const orientations = getUniqueVtgPatternOrientations(selection)

              expect(orientations[0]).toBe(0)
              expect(new Set(orientations).size).toBe(orientations.length)
            }
          }
        }
      }
    }
  })
})
