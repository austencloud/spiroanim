import {
  createDefaultQtrAnimation,
  createDefaultQtrBaseAnimation,
} from '@/features/vtg/qtr/createQtrAnimation'
import { applyVtgPlaybackControls } from '@/features/vtg/createVtgAnimation'
import { hasFixedVtgPatternShape } from '@/features/vtg/data/vtgPatternCatalog'
import { getVtgScaleControlValue } from '@/features/vtg/data/vtgPlayerSettings'
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
import { inferVtgSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import type { VtgCellReference, VtgRuleNumber, VtgSpeedRatio } from '@/features/vtg/types'
import {
  supportsVtgPatternOrientation,
  vtgBeats,
  vtgPatternOrientations,
} from '@/features/vtg/types'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type QtrCandidateMatch = Omit<QtrPatternMatch, 'bpm' | 'scale'> & { subdivided?: boolean }

const candidateCaches = new Map<VtgSpeedRatio, ReadonlyMap<string, readonly QtrCandidateMatch[]>>()

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

const buildCandidateCache = (speedRatio: VtgSpeedRatio) => {
  const candidates = new Map<string, QtrCandidateMatch[]>()
  const orientationOptions = supportsVtgPatternOrientation(speedRatio)
    ? vtgPatternOrientations
    : ([0] as const)

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
      const shapeOptions = hasFixedVtgPatternShape(reference, speedRatio)
        ? (['diamond'] as const)
        : patternShapes

      for (const isAnti of antiOptions) {
        for (const shape of shapeOptions) {
          const baseAnimations = new Map<string, RootDataFinal | undefined>()
          const playbackAnimations = new Map<string, RootDataFinal>()

          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              for (const orientation of orientationOptions) {
                const selection: QtrPatternSelection = {
                  reference,
                  speedRatio,
                  quarters: 1,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(orientation === 0 ? undefined : { orientation }),
                  ...(shape === 'box' ? { shape } : undefined),
                }
                // Box keeps QTR #1 for both final-plane states, so those bases are shared.
                const baseKey = `${shape === 'box' ? false : reversePlane}:${orientation}`
                let baseAnimation = baseAnimations.get(baseKey)
                if (!baseAnimations.has(baseKey)) {
                  baseAnimation = createDefaultQtrBaseAnimation(selection)
                  baseAnimations.set(baseKey, baseAnimation)
                }
                if (!baseAnimation) continue

                for (const beat of vtgBeats) {
                  const candidate: QtrCandidateMatch = {
                    reference,
                    speedRatio,
                    quarters: 1,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(orientation === 0 ? undefined : { orientation }),
                    ...(beat === 1 ? undefined : { beat }),
                    ...(shape === 'box' ? { shape } : undefined),
                  }
                  const playbackKey = `${baseKey}:${beat}`
                  let playback = playbackAnimations.get(playbackKey)
                  if (!playback) {
                    playback = applyVtgPlaybackControls(baseAnimation, { speedRatio, beat })
                    if (!playback) continue
                    playbackAnimations.set(playbackKey, playback)
                  }

                  const finalTransforms = { swapProps, reversePlane }
                  addCandidate(
                    candidates,
                    createFinalTransformedVtgAnimationSignature(playback, finalTransforms),
                    candidate,
                  )

                  const subdivided = doubleAnimationPlayback(playback)
                  if (subdivided) {
                    addCandidate(
                      candidates,
                      createFinalTransformedVtgAnimationSignature(subdivided, finalTransforms),
                      { ...candidate, subdivided: true },
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

  candidateCaches.set(speedRatio, candidates)
  return candidates
}

export const findQtrPatternMatches = (animation: RootDataFinal): readonly QtrPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  const matchingAnimation = alternating?.base ?? animation
  const speedRatio = inferVtgSpeedRatio(matchingAnimation)
  if (speedRatio === undefined) return []

  const adjustedScale = getVtgAnimationScale(matchingAnimation)
  if (adjustedScale === undefined) return []
  const scale = getVtgScaleControlValue(adjustedScale, speedRatio)

  const signature = createVtgAnimationSignature(matchingAnimation)
  if (!signature) return []

  const candidates = candidateCaches.get(speedRatio) ?? buildCandidateCache(speedRatio)
  return (candidates.get(signature) ?? [])
    .filter((candidate) => !alternating || candidate.subdivided)
    .map((candidate) => {
      const { subdivided, ...match } = candidate
      return {
        ...match,
        ...(alternating
          ? {
              transition: true,
              transitionBeats: alternating.transitionBeats,
              ...(alternating.transitionQuad ? { transitionQuad: true } : undefined),
              ...(alternating.transitionSecond ? { transitionSecond: true } : undefined),
            }
          : undefined),
        bpm: subdivided ? animation.bpm / doublePlaybackMultiplier : animation.bpm,
        scale,
      }
    })
}

const startingBeat = (match: QtrPatternMatch) => match.beat ?? 1

const playbackTransformationCount = (match: QtrPatternMatch) => Number(match.transition === true)

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
