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
  vtgDefaultBeat,
  vtgTransitionInitialTurnsOffsets,
} from '@/features/vtg/types'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'>

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

                for (const initialTurnsOffset of vtgTransitionInitialTurnsOffsets) {
                  addCandidate(
                    transitionTurnsCandidates,
                    createFinalTransformedVtgAnimationSignature(playback, {
                      ...finalTransforms,
                      initialTurnsOffset,
                    }),
                    { ...candidate, initialTurnsOffset },
                  )
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

const findCachedCandidates = (
  speedRatio: VtgSpeedRatio,
  rotationFilter: VtgPatternRotationFilter | undefined,
  signature: string,
  cacheKind: keyof VtgCandidateCache,
  stopAtFirstMatchingTier: boolean,
): readonly VtgCandidateMatch[] => {
  const orientations = getMatchingOrientations(speedRatio, rotationFilter)
  const orientationTiers = [
    orientations.filter((orientation) => orientation === 0),
    orientations.filter((orientation) => orientation !== 0),
  ]

  const allMatches: VtgCandidateMatch[] = []
  for (const tier of orientationTiers) {
    const matches = tier.flatMap(
      (orientation) => getCandidateCache(speedRatio, orientation)[cacheKind].get(signature) ?? [],
    )
    if (matches.length > 0 && stopAtFirstMatchingTier) return matches
    allMatches.push(...matches)
  }

  return allMatches
}

const findBaseVtgCandidateMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
  includeTransitionTurns = true,
  stopAtFirstMatchingOrientationTier = false,
): readonly VtgPatternMatch[] => {
  const speedRatio = inferVtgSpeedRatio(animation)
  if (speedRatio === undefined) return []

  const adjustedScale = getVtgAnimationScale(animation)
  if (adjustedScale === undefined) return []
  const scale = getVtgScaleControlValue(adjustedScale, speedRatio)

  const signature = createVtgAnimationSignature(animation)
  if (!signature) return []

  const exactMatches = findCachedCandidates(
    speedRatio,
    rotationFilter,
    signature,
    'exact',
    stopAtFirstMatchingOrientationTier,
  )
  const candidates =
    exactMatches.length > 0 || !includeTransitionTurns
      ? exactMatches
      : findCachedCandidates(
          speedRatio,
          rotationFilter,
          signature,
          'transitionTurns',
          stopAtFirstMatchingOrientationTier,
        )

  return candidates.map((candidate) => ({
    ...candidate,
    bpm: animation.bpm / doublePlaybackMultiplier,
    scale,
  }))
}

const findBaseVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
  stopAtFirstMatchingOrientationTier = false,
): readonly VtgPatternMatch[] =>
  findBaseVtgCandidateMatches(animation, rotationFilter, true, stopAtFirstMatchingOrientationTier)

const findVtgPatternMatchesInternal = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
  stopAtFirstMatchingOrientationTier = false,
): readonly VtgPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  if (!alternating) {
    return findBaseVtgPatternMatches(animation, rotationFilter, stopAtFirstMatchingOrientationTier)
  }

  return findBaseVtgCandidateMatches(
    alternating.base,
    rotationFilter,
    false,
    stopAtFirstMatchingOrientationTier,
  ).map((match) => ({
    ...match,
    transition: true,
    transitionBeats: alternating.transitionBeats,
    ...(alternating.transitionAfterBeat ? { transitionAfterBeat: true } : undefined),
    ...(alternating.transitionQuad ? { transitionQuad: true } : undefined),
    ...(alternating.transitionSecond ? { transitionSecond: true } : undefined),
  }))
}

export const findVtgPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly VtgPatternMatch[] => findVtgPatternMatchesInternal(animation, rotationFilter)

const startingBeat = (match: VtgPatternMatch) => match.beat ?? vtgDefaultBeat

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
  [...preferUnrotatedMatches(findVtgPatternMatchesInternal(animation, rotationFilter, true))].sort(
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
