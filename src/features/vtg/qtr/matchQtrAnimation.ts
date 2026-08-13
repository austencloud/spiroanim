import {
  createDefaultQtrAnimation,
  createDefaultQtrBaseAnimation,
} from '@/features/vtg/qtr/createQtrAnimation'
import { applyVtgPlaybackControls } from '@/features/vtg/createVtgAnimation'
import { vtgFixedShapeCells } from '@/features/vtg/data/vtgPatternCatalog'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
} from '@/features/vtg/types'
import {
  createFinalTransformedVtgAnimationSignature,
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import type { VtgCellReference, VtgRuleNumber } from '@/features/vtg/types'
import { supportsVtgQtrTransition, vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type QtrCandidateMatch = Omit<QtrPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly QtrCandidateMatch[]> | undefined

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const addCandidate = (
  candidates: Map<string, QtrCandidateMatch[]>,
  signature: string | undefined,
  candidate: QtrCandidateMatch,
) => {
  if (!signature) return

  const matches = candidates.get(signature) ?? []
  matches.push(candidate)
  candidates.set(signature, matches)
}

const buildCandidateCache = () => {
  const candidates = new Map<string, QtrCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
      const shapeOptions = vtgFixedShapeCells.has(reference)
        ? (['diamond'] as const)
        : patternShapes

      for (const speedRatio of vtgSpeedRatios) {
        for (const isAnti of antiOptions) {
          for (const shape of shapeOptions) {
            const baseAnimations = new Map<boolean, RootDataFinal | undefined>()
            const playbackAnimations = new Map<
              boolean,
              Map<
                QtrPatternSelection['beat'],
                readonly [RootDataFinal | undefined, RootDataFinal | undefined]
              >
            >()

            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                const selection: QtrPatternSelection = {
                  reference,
                  speedRatio,
                  quarters: 1,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(shape === 'box' ? { shape } : undefined),
                }
                // Box keeps QTR #1 for both final-plane states, so its playback bases are shared.
                const baseKey = shape === 'box' ? false : reversePlane
                let baseAnimation = baseAnimations.get(baseKey)
                if (!baseAnimations.has(baseKey)) {
                  baseAnimation = createDefaultQtrBaseAnimation(selection)
                  baseAnimations.set(baseKey, baseAnimation)
                }
                if (!baseAnimation) continue

                let reversePlaybackAnimations = playbackAnimations.get(baseKey)
                if (!reversePlaybackAnimations) {
                  reversePlaybackAnimations = new Map()
                  playbackAnimations.set(baseKey, reversePlaybackAnimations)
                }

                for (const beat of vtgBeats) {
                  const candidate: QtrCandidateMatch = {
                    reference,
                    speedRatio,
                    quarters: 1,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(beat === 1 ? undefined : { beat }),
                    ...(shape === 'box' ? { shape } : undefined),
                  }
                  let playback = reversePlaybackAnimations.get(beat)
                  if (!playback) {
                    playback = [
                      applyVtgPlaybackControls(baseAnimation, { speedRatio, beat }),
                      applyVtgPlaybackControls(baseAnimation, {
                        speedRatio,
                        beat,
                        double: true,
                      }),
                    ]
                    reversePlaybackAnimations.set(beat, playback)
                  }

                  const [animation, doubled] = playback
                  if (!animation) continue

                  const finalTransforms = { swapProps, reversePlane }
                  addCandidate(
                    candidates,
                    createFinalTransformedVtgAnimationSignature(animation, finalTransforms),
                    candidate,
                  )

                  if (doubled) {
                    addCandidate(
                      candidates,
                      createFinalTransformedVtgAnimationSignature(doubled, finalTransforms),
                      { ...candidate, double: true },
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  candidateCache = candidates
  return candidates
}

export const findQtrPatternMatches = (animation: RootDataFinal): readonly QtrPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  const matchingAnimation = alternating?.base ?? animation
  const scale = getVtgAnimationScale(matchingAnimation)
  if (scale === undefined) return []

  const signature = createVtgAnimationSignature(matchingAnimation)
  if (!signature) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? [])
    .filter(
      (candidate) =>
        !alternating || (candidate.double && supportsVtgQtrTransition(candidate.speedRatio)),
    )
    .map((candidate) => ({
      ...candidate,
      ...(alternating
        ? {
            transition: true,
            transitionBeats: alternating.transitionBeats,
            ...(alternating.transitionQuad ? { transitionQuad: true } : undefined),
            ...(alternating.transitionSecond ? { transitionSecond: true } : undefined),
          }
        : undefined),
      bpm: candidate.double ? animation.bpm / doublePlaybackMultiplier : animation.bpm,
      scale,
    }))
}

const startingBeat = (match: QtrPatternMatch) => match.beat ?? 1

const playbackTransformationCount = (match: QtrPatternMatch) =>
  Number(match.double === true) + Number(match.transition === true)

const preferenceDifferenceCount = (
  match: QtrPatternMatch,
  preferences: QtrPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

export const findQtrPatternMatch = (
  animation: RootDataFinal,
  preferences?: QtrPatternMatchPreferences,
): QtrPatternMatch | undefined =>
  [...findQtrPatternMatches(animation)].sort((first, second) => {
    if (preferences) {
      const preferenceDifference =
        preferenceDifferenceCount(first, preferences) -
        preferenceDifferenceCount(second, preferences)
      if (preferenceDifference !== 0) return preferenceDifference
    }

    const beatDifference = startingBeat(first) - startingBeat(second)
    if (beatDifference !== 0) return beatDifference

    return playbackTransformationCount(first) - playbackTransformationCount(second)
  })[0]

export const matchesQtrSelection = (
  animation: RootDataFinal,
  selection: QtrPatternSelection,
): boolean => {
  const candidate = createDefaultQtrAnimation(selection)
  if (!candidate) return false

  return createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
}
