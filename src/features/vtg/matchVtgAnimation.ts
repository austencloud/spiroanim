import {
  applyVtgPlaybackControls,
  createDefaultVtgAnimation,
} from '@/features/vtg/createVtgAnimation'
import { vtgFixedShapeCells } from '@/features/vtg/data/vtgPatternCatalog'
import {
  createFinalTransformedVtgAnimationSignature,
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { inferVtgSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { vtgBeats } from '@/features/vtg/types'
import { supportsVtgQtrTransition } from '@/features/vtg/types'
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

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'> & { subdivided?: boolean }

const candidateCaches = new Map<VtgSpeedRatio, ReadonlyMap<string, readonly VtgCandidateMatch[]>>()

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const addCandidate = (
  candidates: Map<string, VtgCandidateMatch[]>,
  signature: string | undefined,
  candidate: VtgCandidateMatch,
) => {
  if (!signature) return

  const matches = candidates.get(signature) ?? []
  matches.push(candidate)
  candidates.set(signature, matches)
}

const buildCandidateCache = (speedRatio: VtgSpeedRatio) => {
  const candidates = new Map<string, VtgCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
      const shapeOptions = vtgFixedShapeCells.has(reference)
        ? (['diamond'] as const)
        : patternShapes

      for (const isAnti of antiOptions) {
        for (const shape of shapeOptions) {
          const baseSelection: VtgPatternSelection = {
            reference,
            speedRatio,
            isAnti,
            ...(shape === 'box' ? { shape } : undefined),
          }
          const baseAnimation = createDefaultVtgAnimation(baseSelection)
          if (!baseAnimation) continue

          const playbackAnimations = new Map<VtgPatternSelection['beat'], RootDataFinal>()

          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              for (const beat of vtgBeats) {
                const candidate: VtgCandidateMatch = {
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(beat === 1 ? undefined : { beat }),
                  ...(shape === 'box' ? { shape } : undefined),
                }
                let playback = playbackAnimations.get(beat)
                if (!playback) {
                  playback = applyVtgPlaybackControls(baseAnimation, { speedRatio, beat })
                  if (!playback) continue
                  playbackAnimations.set(beat, playback)
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

  candidateCaches.set(speedRatio, candidates)
  return candidates
}

const findBaseVtgCandidateMatches = (
  animation: RootDataFinal,
): readonly (VtgPatternMatch & { subdivided?: boolean })[] => {
  const scale = getVtgAnimationScale(animation)
  if (scale === undefined) return []

  const speedRatio = inferVtgSpeedRatio(animation)
  if (speedRatio === undefined) return []

  const signature = createVtgAnimationSignature(animation)
  if (!signature) return []

  const candidates = candidateCaches.get(speedRatio) ?? buildCandidateCache(speedRatio)
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: candidate.subdivided ? animation.bpm / doublePlaybackMultiplier : animation.bpm,
    scale,
  }))
}

const withoutSubdivisionMarker = ({
  subdivided: _subdivided,
  ...match
}: VtgPatternMatch & { subdivided?: boolean }): VtgPatternMatch => match

const findBaseVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] =>
  findBaseVtgCandidateMatches(animation).map(withoutSubdivisionMarker)

export const findVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  if (!alternating) return findBaseVtgPatternMatches(animation)

  return findBaseVtgCandidateMatches(alternating.base)
    .filter((match) => match.subdivided && supportsVtgQtrTransition(match.speedRatio))
    .map((match) => ({
      ...withoutSubdivisionMarker(match),
      transition: true,
      transitionBeats: alternating.transitionBeats,
      ...(alternating.transitionQuad ? { transitionQuad: true } : undefined),
      ...(alternating.transitionSecond ? { transitionSecond: true } : undefined),
    }))
}

const startingBeat = (match: VtgPatternMatch) => match.beat ?? 1

const playbackTransformationCount = (match: VtgPatternMatch) => Number(match.transition === true)

const preferenceDifferenceCount = (
  match: VtgPatternMatch,
  preferences: VtgPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

/**
 * Tries every starting beat before changing the current non-playback controls.
 * Equivalent candidates that retain those controls are canonicalized to the
 * lowest starting beat only as a tie-breaker.
 */
export const findVtgPatternMatch = (
  animation: RootDataFinal,
  preferences?: VtgPatternMatchPreferences,
): VtgPatternMatch | undefined =>
  [...findVtgPatternMatches(animation)].sort((first, second) => {
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

export const matchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  if (!candidate) return false

  return createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
}
