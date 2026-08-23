import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import {
  createVtgTransitionQuickSlotAnimationCandidates,
  resolveVtgTransitionQuickSlotAnimations,
  type VtgTransitionQuickSlotCandidates,
  type VtgTransitionQuickSlotMatchKind,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getUniqueVtgPatternOrientations } from '@/features/vtg/math/getUniqueVtgPatternOrientations'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import type {
  QtrPatternMatch,
  VtgPatternMatch,
  VtgPatternRotationFilter,
  VtgBeat,
  VtgCellReference,
  VtgRuleNumber,
  VtgSpeedRatio,
  VtgTransitionBeats,
} from '@/features/vtg/types'
import { getVtgBeats, vtgSpeedRatios, vtgTransitionBeats } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { doubleAnimationPlayback } from '@/math/animation/subdivideAnimationPlayback'
import type { PatternShape } from '@/types/PatternTypes'
import type { RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const shapes = ['diamond', 'box'] as const satisfies readonly PatternShape[]
const transitionModes = vtgTransitionBeats.flatMap((transitionBeats) => [
  { transitionBeats, transitionQuad: false, transitionSecond: false },
  { transitionBeats, transitionQuad: true, transitionSecond: false },
  { transitionBeats, transitionQuad: true, transitionSecond: true },
])
const exhaustiveAuditTimeout = 10 * 60 * 1000
const orientationAuditTimeout = 30 * 1000

interface UnclassifiedTransition {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  shape: PatternShape
  beat: VtgBeat
  transitionBeats: VtgTransitionBeats
  transitionQuad: boolean
  transitionSecond: boolean
  slot: number
}

interface IncorrectQuickSlot extends UnclassifiedTransition {
  reason: string
}

interface IncorrectExtraction {
  reference: VtgCellReference
  speedRatio: VtgSpeedRatio
  shape: PatternShape
  beat: VtgBeat
  transitionBeats: VtgTransitionBeats
  transitionQuad: boolean
  transitionSecond: boolean
  reason: string
}

const compiledFrameMatches = (
  actual: ReturnType<typeof rootCompile>['props'][number]['anim'][number],
  expected: ReturnType<typeof rootCompile>['props'][number]['anim'][number],
) =>
  (['pos', 'rot', 'adju'] as const).every((key) =>
    actual[key].every(
      (coordinate, coordinateIndex) =>
        Math.abs(coordinate - (expected[key][coordinateIndex] ?? Infinity)) < 1e-10,
    ),
  )

const validateTransitionExtractions = (
  source: RootDataFinal,
  candidates: VtgTransitionQuickSlotCandidates,
  transitionBeats: VtgTransitionBeats,
): string | undefined => {
  const sourceCompiled = rootCompile(source)
  const transitionFrameCount = transitionBeats * 2

  for (let candidateIndex = 1; candidateIndex < candidates.length; candidateIndex++) {
    const raw = candidates[candidateIndex]
    if (!raw) return `Q${candidateIndex + 1} has no raw extraction`
    if (raw.bpm !== source.bpm) return `Q${candidateIndex + 1} changed BPM`

    const segmentIndex = candidateIndex - 1
    const sourceFrameIndex = segmentIndex === 0 ? 0 : segmentIndex * transitionFrameCount + 1
    const rawCompiled = rootCompile(raw)

    for (const [propIndex, rawProp] of raw.props.entries()) {
      const sourceProp = sourceCompiled.props[propIndex]
      const rawCompiledProp = rawCompiled.props[propIndex]
      if (!sourceProp || !rawCompiledProp)
        return `Q${candidateIndex + 1} lost prop ${propIndex + 1}`
      if (rawProp.anim.length !== 9) return `Q${candidateIndex + 1} is not a nine-frame cycle`
      if (rawProp.anim.slice(2).some((frame) => Object.keys(frame).length > 0)) {
        return `Q${candidateIndex + 1} contains authored data after its extracted interval`
      }

      const expectedStart = sourceProp.anim[sourceFrameIndex]
      const expectedEnd = sourceProp.anim[sourceFrameIndex + 1]
      const actualStart = rawCompiledProp.anim[0]
      const actualEnd = rawCompiledProp.anim[1]
      if (!expectedStart || !expectedEnd || !actualStart || !actualEnd) {
        return `Q${candidateIndex + 1} references an unavailable source frame`
      }
      if (!compiledFrameMatches(actualStart, expectedStart)) {
        return `Q${candidateIndex + 1} starts at the wrong source frame for prop ${propIndex + 1}`
      }
      if (!compiledFrameMatches(actualEnd, expectedEnd)) {
        return `Q${candidateIndex + 1} ends at the wrong source frame for prop ${propIndex + 1}`
      }
    }
  }

  return undefined
}

const findMatches = (animation: RootDataFinal, rotationFilter?: VtgPatternRotationFilter) => [
  { source: 'vtg' as const, match: findVtgPatternMatch(animation, undefined, rotationFilter) },
  { source: 'qtr' as const, match: findQtrPatternMatch(animation, undefined, rotationFilter) },
]

const getMatchKind = (
  animation: RootDataFinal,
  rotationFilter: VtgPatternRotationFilter,
): VtgTransitionQuickSlotMatchKind | false => {
  const matches = findMatches(animation, rotationFilter)
    .map(({ match }) => match)
    .filter((match) => match !== undefined)
  if (matches.some((match) => match.initialTurnsOffset === undefined)) return 'exact'
  return matches.length > 0 ? 'transitionTurns' : false
}

const getPreferredMatch = (animation: RootDataFinal) => {
  const matches = findMatches(animation)
  return (
    matches.find(({ match }) => match !== undefined && match.initialTurnsOffset === undefined) ??
    matches.find(
      (
        candidate,
      ): candidate is
        | { source: 'vtg'; match: VtgPatternMatch }
        | { source: 'qtr'; match: QtrPatternMatch } => candidate.match !== undefined,
    )
  )
}

const compiledAnimationsMatch = (actual: RootDataFinal, expected: RootDataFinal) => {
  if (
    actual.bpm !== expected.bpm ||
    createVtgAnimationSignature(actual) !== createVtgAnimationSignature(expected)
  ) {
    return false
  }

  const actualProps = rootCompile(actual).props
  const expectedProps = rootCompile(expected).props
  if (actualProps.length !== expectedProps.length) return false

  return actualProps.every((actualProp, propIndex) => {
    const expectedProp = expectedProps[propIndex]
    if (!expectedProp || actualProp.anim.length !== expectedProp.anim.length) return false
    return actualProp.anim.every((actualFrame, frameIndex) => {
      const expectedFrame = expectedProp.anim[frameIndex]
      if (!expectedFrame) return false
      return (['pos', 'rot', 'adju'] as const).every((key) =>
        actualFrame[key].every(
          (coordinate, coordinateIndex) =>
            Math.abs(coordinate - (expectedFrame[key][coordinateIndex] ?? Infinity)) < 1e-10,
        ),
      )
    })
  })
}

const matchRegeneratesExactly = (animation: RootDataFinal) => {
  const result = getPreferredMatch(animation)
  if (!result?.match) return false
  const regenerated =
    result.source === 'vtg'
      ? createDefaultVtgAnimation(result.match)
      : createDefaultQtrAnimation(result.match)
  if (!regenerated) return false
  if (compiledAnimationsMatch(regenerated, animation)) return true

  const doubled = doubleAnimationPlayback(regenerated)
  return doubled !== undefined && compiledAnimationsMatch(doubled, animation)
}

describe('VTG 45 transition catalog audit', () => {
  it(
    'extracts every transition correctly and exactly regenerates every catalog match',
    async () => {
      const unclassified: UnclassifiedTransition[] = []
      const incorrect: IncorrectQuickSlot[] = []
      const incorrectExtractions: IncorrectExtraction[] = []

      for (const speedRatio of vtgSpeedRatios) {
        for (const row of ruleNumbers) {
          for (const column of ruleNumbers) {
            const reference: VtgCellReference = `${row}-${column}`
            for (const shape of shapes) {
              for (const beat of getVtgBeats(speedRatio)) {
                for (const mode of transitionModes) {
                  const animation = createDefaultVtgAnimation({
                    reference,
                    speedRatio,
                    shape,
                    beat,
                    transition: true,
                    ...mode,
                  })
                  if (!animation) continue
                  const candidates = createVtgTransitionQuickSlotAnimationCandidates(animation)
                  if (!candidates) throw new Error(`Could not extract ${speedRatio} ${reference}`)

                  const extractionError = validateTransitionExtractions(
                    animation,
                    candidates,
                    mode.transitionBeats,
                  )
                  if (extractionError) {
                    incorrectExtractions.push({
                      reference,
                      speedRatio,
                      shape,
                      beat,
                      ...mode,
                      reason: extractionError,
                    })
                  }

                  const result = await resolveVtgTransitionQuickSlotAnimations(
                    candidates,
                    getMatchKind,
                  )
                  if (result.status === 'partial') {
                    unclassified.push(
                      ...result.unmatchedSlots.map((slot) => ({
                        reference,
                        speedRatio,
                        shape,
                        beat,
                        ...mode,
                        slot,
                      })),
                    )
                  }

                  for (let slotIndex = 1; slotIndex < result.animations.length; slotIndex++) {
                    if (
                      result.status === 'partial' &&
                      result.unmatchedSlots.includes(slotIndex + 1)
                    ) {
                      continue
                    }

                    const resolved = result.animations[slotIndex]
                    const candidate = candidates[slotIndex]
                    if (!resolved || resolved !== candidate) {
                      incorrect.push({
                        reference,
                        speedRatio,
                        shape,
                        beat,
                        ...mode,
                        slot: slotIndex + 1,
                        reason: 'resolver returned an animation outside the extracted candidates',
                      })
                      continue
                    }
                    if (!matchRegeneratesExactly(resolved)) {
                      incorrect.push({
                        reference,
                        speedRatio,
                        shape,
                        beat,
                        ...mode,
                        slot: slotIndex + 1,
                        reason: 'selected controls did not regenerate the resolved animation',
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }

      const counts = Object.fromEntries(
        [...new Set(unclassified.map(({ speedRatio, slot }) => `${speedRatio} Q${slot}`))].map(
          (key) => [
            key,
            unclassified.filter(({ speedRatio, slot }) => `${speedRatio} Q${slot}` === key).length,
          ],
        ),
      )
      expect(
        incorrectExtractions.length,
        `Incorrect transition extractions: ${incorrectExtractions.length}\nFirst 20:\n${JSON.stringify(incorrectExtractions.slice(0, 20), null, 2)}`,
      ).toBe(0)
      expect(
        incorrect.length,
        `Incorrect resolved Quick Slots: ${incorrect.length}\nFirst 20:\n${JSON.stringify(incorrect.slice(0, 20), null, 2)}`,
      ).toBe(0)
      console.info(
        `Unclassified transition extractions: ${unclassified.length} ${JSON.stringify(counts)}`,
      )
    },
    exhaustiveAuditTimeout,
  )

  it(
    'returns valid duplicate-free rotation options at every ratio',
    () => {
      for (const speedRatio of vtgSpeedRatios) {
        for (const row of ruleNumbers) {
          for (const column of ruleNumbers) {
            const reference: VtgCellReference = `${row}-${column}`
            for (const shape of ['diamond', 'box'] as const) {
              for (const quarters of [false, true] as const) {
                const selection = {
                  reference,
                  speedRatio,
                  ...(shape === 'box' ? { shape } : undefined),
                  ...(quarters ? { quarters: 1 as const } : undefined),
                }
                const orientations = getUniqueVtgPatternOrientations(selection)

                expect(orientations).toContain(0)
                expect(new Set(orientations).size).toBe(orientations.length)
              }
            }
          }
        }
      }
    },
    orientationAuditTimeout,
  )
})
