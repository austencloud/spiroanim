import {
  applyVtgPlaybackControls,
  createDefaultVtgAnimation,
} from '@/features/vtg/createVtgAnimation'
import { hasFixedVtgPatternShape } from '@/features/vtg/data/vtgPatternCatalog'
import { getVtgScaleControlValue } from '@/features/vtg/data/vtgPlayerSettings'
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
  VtgPatternRotationFilter,
  VtgPatternSelection,
  VtgRuleNumber,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import {
  getVtgPatternOrientations,
  supportsVtgPatternOrientation,
  vtgBeats,
  vtgTransitionInitialTurnsOffsets,
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

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'> & { subdivided?: boolean }

interface VtgCandidateCache {
  exact: ReadonlyMap<string, readonly VtgCandidateMatch[]>
  transitionTurns: ReadonlyMap<string, readonly VtgCandidateMatch[]>
}

const candidateCaches = new Map<
  VtgSpeedRatio,
  Map<VtgPatternSelection['orientation'], VtgCandidateCache>
>()

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

const buildCandidateCache = (
  speedRatio: VtgSpeedRatio,
  orientation: NonNullable<VtgPatternSelection['orientation']>,
) => {
  const exactCandidates = new Map<string, VtgCandidateMatch[]>()
  const transitionTurnsCandidates = new Map<string, VtgCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
      const shapeOptions = hasFixedVtgPatternShape(reference, speedRatio)
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
          const baseAnimations = new Map<number, RootDataFinal>()
          const playbackAnimations = new Map<string, RootDataFinal>()

          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              let baseAnimation = baseAnimations.get(orientation)
              if (!baseAnimation) {
                baseAnimation = createDefaultVtgAnimation({
                  ...baseSelection,
                  ...(orientation === 0 ? undefined : { orientation }),
                })
                if (!baseAnimation) continue
                baseAnimations.set(orientation, baseAnimation)
              }

              for (const beat of vtgBeats) {
                const candidate: VtgCandidateMatch = {
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(orientation === 0 ? undefined : { orientation }),
                  ...(beat === 1 ? undefined : { beat }),
                  ...(shape === 'box' ? { shape } : undefined),
                }
                const playbackKey = `${orientation}:${beat}`
                let playback = playbackAnimations.get(playbackKey)
                if (!playback) {
                  playback = applyVtgPlaybackControls(baseAnimation, { speedRatio, beat })
                  if (!playback) continue
                  playbackAnimations.set(playbackKey, playback)
                }

                const finalTransforms = { swapProps, reversePlane }
                addCandidate(
                  exactCandidates,
                  createFinalTransformedVtgAnimationSignature(playback, finalTransforms),
                  candidate,
                )

                const subdivided = doubleAnimationPlayback(playback)
                if (subdivided) {
                  addCandidate(
                    exactCandidates,
                    createFinalTransformedVtgAnimationSignature(subdivided, finalTransforms),
                    { ...candidate, subdivided: true },
                  )
                  for (const initialTurnsOffset of vtgTransitionInitialTurnsOffsets) {
                    addCandidate(
                      transitionTurnsCandidates,
                      createFinalTransformedVtgAnimationSignature(subdivided, {
                        ...finalTransforms,
                        initialTurnsOffset,
                      }),
                      { ...candidate, subdivided: true, initialTurnsOffset },
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

  const speedRatioCaches = candidateCaches.get(speedRatio) ?? new Map()
  const candidates = { exact: exactCandidates, transitionTurns: transitionTurnsCandidates }
  speedRatioCaches.set(orientation, candidates)
  candidateCaches.set(speedRatio, speedRatioCaches)
  return candidates
}

const getCandidateCache = (
  speedRatio: VtgSpeedRatio,
  orientation: NonNullable<VtgPatternSelection['orientation']>,
) =>
  candidateCaches.get(speedRatio)?.get(orientation) ?? buildCandidateCache(speedRatio, orientation)

const getMatchingOrientations = (
  speedRatio: VtgSpeedRatio,
  rotationFilter?: VtgPatternRotationFilter,
) => {
  const orientations = supportsVtgPatternOrientation(speedRatio)
    ? getVtgPatternOrientations(speedRatio)
    : ([0] as const)
  if (!rotationFilter) return orientations

  return orientations.filter((orientation) =>
    rotationFilter === 'unrotated' ? orientation === 0 : orientation !== 0,
  )
}

const findBaseVtgCandidateMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
  includeTransitionTurns = true,
): readonly (VtgPatternMatch & { subdivided?: boolean })[] => {
  const speedRatio = inferVtgSpeedRatio(animation)
  if (speedRatio === undefined) return []

  const adjustedScale = getVtgAnimationScale(animation)
  if (adjustedScale === undefined) return []
  const scale = getVtgScaleControlValue(adjustedScale, speedRatio)

  const signature = createVtgAnimationSignature(animation)
  if (!signature) return []

  const caches = getMatchingOrientations(speedRatio, rotationFilter).map((orientation) =>
    getCandidateCache(speedRatio, orientation),
  )
  const exactMatches = caches.flatMap(({ exact }) => exact.get(signature) ?? [])
  const candidates =
    exactMatches.length > 0 || !includeTransitionTurns
      ? exactMatches
      : caches.flatMap(({ transitionTurns }) => transitionTurns.get(signature) ?? [])

  return candidates.map((candidate) => ({
    ...candidate,
    bpm: candidate.subdivided ? animation.bpm / doublePlaybackMultiplier : animation.bpm,
    scale,
  }))
}

const withoutSubdivisionMarker = ({
  subdivided: _subdivided,
  ...match
}: VtgPatternMatch & { subdivided?: boolean }): VtgPatternMatch => match

const findBaseVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] =>
  findBaseVtgCandidateMatches(animation, rotationFilter).map(withoutSubdivisionMarker)

export const findVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  if (!alternating) return findBaseVtgPatternMatches(animation, rotationFilter)

  return findBaseVtgCandidateMatches(alternating.base, rotationFilter, false)
    .filter((match) => match.subdivided)
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

// Rotation is the final pattern comparison. Keep an equivalent zero-degree interpretation when
// one exists, and use rotated candidates only for signatures the unrotated catalog cannot cover.
const preferUnrotatedMatches = (
  matches: readonly VtgPatternMatch[],
): readonly VtgPatternMatch[] => {
  const unrotated = matches.filter((match) => (match.orientation ?? 0) === 0)
  return unrotated.length > 0 ? unrotated : matches
}

const preferenceDifferenceCount = (
  match: VtgPatternMatch,
  preferences: VtgPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

/**
 * Tries every starting beat before changing the current non-playback controls within the retained
 * orientation candidates. Equivalent candidates that retain those controls are canonicalized to
 * the lowest starting beat only as a tie-breaker.
 */
export const findVtgPatternMatch = (
  animation: RootDataFinal,
  preferences?: VtgPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
): VtgPatternMatch | undefined =>
  [...preferUnrotatedMatches(findVtgPatternMatches(animation, rotationFilter))].sort(
    (first, second) => {
      if (preferences) {
        const preferenceDifference =
          preferenceDifferenceCount(first, preferences) -
          preferenceDifferenceCount(second, preferences)
        if (preferenceDifference !== 0) return preferenceDifference
      }

      const beatDifference = startingBeat(first) - startingBeat(second)
      if (beatDifference !== 0) return beatDifference

      return playbackTransformationCount(first) - playbackTransformationCount(second)
    },
  )[0]

export const matchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  if (!candidate) return false

  return createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
}
