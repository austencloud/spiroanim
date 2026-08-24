import {
  createDefaultQtrAnimation,
  createDefaultQtrBaseAnimation,
} from '@/features/vtg/qtr/createQtrAnimation'
import { applyVtgPlaybackControls } from '@/features/vtg/createVtgAnimation'
import { getVtgScaleControlValue } from '@/features/vtg/data/vtgPlayerSettings'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
  VtgBeat,
  VtgPatternRotationFilter,
} from '@/features/vtg/types'
import {
  createFinalTransformedVtgAnimationSignature,
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { inferVtgSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import type { VtgCellReference, VtgRuleNumber, VtgSpeedRatio } from '@/features/vtg/types'
import {
  getVtgBeats,
  getVtgPatternOrientations,
  supportsVtgPatternOrientation,
  vtgDefaultBeat,
  vtgTransitionInitialTurnsOffsets,
} from '@/features/vtg/types'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type QtrCandidateMatch = Omit<QtrPatternMatch, 'bpm' | 'scale'>

interface QtrCandidateCache {
  exact?: ReadonlyMap<string, readonly QtrCandidateMatch[]>
  transitionTurns?: ReadonlyMap<string, readonly QtrCandidateMatch[]>
}

const candidateCaches = new Map<
  VtgSpeedRatio,
  Map<QtrPatternSelection['orientation'], Map<VtgBeat, QtrCandidateCache>>
>()

const createCellReference = (row: VtgRuleNumber, column: VtgRuleNumber): VtgCellReference =>
  `${row}-${column}`

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

const buildCandidateCache = (
  speedRatio: VtgSpeedRatio,
  orientation: NonNullable<QtrPatternSelection['orientation']>,
  beat: VtgBeat,
  cacheKind: keyof QtrCandidateCache,
) => {
  const candidates = new Map<string, QtrCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(row, column)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

      for (const isAnti of antiOptions) {
        const baseAnimations = new Map<string, RootDataFinal | undefined>()
        const playbackAnimations = new Map<string, RootDataFinal>()

        for (const swapProps of booleanOptions) {
          for (const reversePlane of booleanOptions) {
            const selection: QtrPatternSelection = {
              reference,
              speedRatio,
              quarters: 1,
              isAnti,
              swapProps,
              reversePlane,
              ...(orientation === 0 ? undefined : { orientation }),
            }
            const baseKey = `${reversePlane}:${orientation}`
            let baseAnimation = baseAnimations.get(baseKey)
            if (!baseAnimations.has(baseKey)) {
              baseAnimation = createDefaultQtrBaseAnimation(selection)
              baseAnimations.set(baseKey, baseAnimation)
            }
            if (!baseAnimation) continue

            const candidate: QtrCandidateMatch = {
              reference,
              speedRatio,
              quarters: 1,
              isAnti,
              swapProps,
              reversePlane,
              ...(orientation === 0 ? undefined : { orientation }),
              ...(beat === 1 ? undefined : { beat }),
            }
            const playbackKey = `${baseKey}:${beat}`
            let playback = playbackAnimations.get(playbackKey)
            if (!playback) {
              playback = applyVtgPlaybackControls(baseAnimation, { speedRatio, beat })
              if (!playback) continue
              playbackAnimations.set(playbackKey, playback)
            }

            const finalTransforms = { swapProps, reversePlane }
            if (cacheKind === 'exact') {
              addCandidate(
                candidates,
                createFinalTransformedVtgAnimationSignature(playback, finalTransforms),
                candidate,
              )
            } else {
              for (const initialTurnsOffset of vtgTransitionInitialTurnsOffsets) {
                addCandidate(
                  candidates,
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

  const speedRatioCaches = candidateCaches.get(speedRatio) ?? new Map()
  const orientationCaches = speedRatioCaches.get(orientation) ?? new Map()
  const orientationCache = orientationCaches.get(beat) ?? {}
  orientationCache[cacheKind] = candidates
  orientationCaches.set(beat, orientationCache)
  speedRatioCaches.set(orientation, orientationCaches)
  candidateCaches.set(speedRatio, speedRatioCaches)
  return candidates
}

const getCandidateCache = (
  speedRatio: VtgSpeedRatio,
  orientation: NonNullable<QtrPatternSelection['orientation']>,
  beat: VtgBeat,
  cacheKind: keyof QtrCandidateCache,
) =>
  candidateCaches.get(speedRatio)?.get(orientation)?.get(beat)?.[cacheKind] ??
  buildCandidateCache(speedRatio, orientation, beat, cacheKind)

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
  preferredOrientation: number | undefined,
  signature: string,
  cacheKind: keyof QtrCandidateCache,
  stopAtFirstMatchingTier: boolean,
): readonly QtrCandidateMatch[] => {
  const orientations = getMatchingOrientations(speedRatio, rotationFilter)
  const preferred = orientations.filter((orientation) => orientation === preferredOrientation)
  const unrotated = orientations.filter(
    (orientation) => orientation === 0 && orientation !== preferredOrientation,
  )
  const remaining = orientations.filter(
    (orientation) => orientation !== 0 && orientation !== preferredOrientation,
  )
  const orientationTiers = [preferred, unrotated, remaining].filter((tier) => tier.length > 0)

  const allMatches: QtrCandidateMatch[] = []
  for (const tier of orientationTiers) {
    const tierMatches: QtrCandidateMatch[] = []
    for (const beat of getVtgBeats(speedRatio)) {
      const matches = tier.flatMap(
        (orientation) =>
          getCandidateCache(speedRatio, orientation, beat, cacheKind).get(signature) ?? [],
      )
      tierMatches.push(...matches)
    }
    if (tierMatches.length > 0 && stopAtFirstMatchingTier) return tierMatches
    allMatches.push(...tierMatches)
  }

  return allMatches
}

const findQtrPatternMatchesInternal = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
  stopAtFirstMatchingOrientationTier = false,
  preferredOrientation?: number,
): readonly QtrPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  const matchingAnimation = alternating?.base ?? animation
  const speedRatio = inferVtgSpeedRatio(matchingAnimation)
  if (speedRatio === undefined) return []

  const adjustedScale = getVtgAnimationScale(matchingAnimation)
  if (adjustedScale === undefined) return []
  const scale = getVtgScaleControlValue(adjustedScale, speedRatio)

  const signature = createVtgAnimationSignature(matchingAnimation)
  if (!signature) return []

  const exactMatches = findCachedCandidates(
    speedRatio,
    rotationFilter,
    preferredOrientation,
    signature,
    'exact',
    stopAtFirstMatchingOrientationTier,
  )
  const candidates =
    exactMatches.length > 0 || alternating !== undefined
      ? exactMatches
      : findCachedCandidates(
          speedRatio,
          rotationFilter,
          preferredOrientation,
          signature,
          'transitionTurns',
          stopAtFirstMatchingOrientationTier,
        )

  return candidates.map((candidate) => ({
    ...candidate,
    ...(alternating
      ? {
          transition: true,
          transitionBeats: alternating.transitionBeats,
          ...(alternating.transitionAfterBeat ? { transitionAfterBeat: true } : undefined),
          ...(alternating.transitionQuad ? { transitionQuad: true } : undefined),
          ...(alternating.transitionSecond ? { transitionSecond: true } : undefined),
        }
      : undefined),
    bpm: animation.bpm / doublePlaybackMultiplier,
    scale,
  }))
}

export const findQtrPatternMatches = (
  animation: RootDataFinal,
  rotationFilter?: VtgPatternRotationFilter,
): readonly QtrPatternMatch[] => findQtrPatternMatchesInternal(animation, rotationFilter)

const startingBeat = (match: QtrPatternMatch) => match.beat ?? vtgDefaultBeat

const playbackTransformationCount = (match: QtrPatternMatch) => Number(match.transition === true)

// Rotation is the final pattern comparison. Keep an equivalent zero-degree interpretation when
// one exists, and use rotated candidates only for signatures the unrotated catalog cannot cover.
const preferUnrotatedMatches = (
  matches: readonly QtrPatternMatch[],
  preferences?: QtrPatternMatchPreferences,
): readonly QtrPatternMatch[] => {
  if (preferences?.orientation !== undefined) {
    const preferred = matches.filter(
      (match) => (match.orientation ?? 0) === preferences.orientation,
    )
    if (preferred.length > 0) return preferred
  }
  const unrotated = matches.filter((match) => (match.orientation ?? 0) === 0)
  return unrotated.length > 0 ? unrotated : matches
}

const preferenceDifferenceCount = (
  match: QtrPatternMatch,
  preferences: QtrPatternMatchPreferences,
) =>
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

export const findQtrPatternMatch = (
  animation: RootDataFinal,
  preferences?: QtrPatternMatchPreferences,
  rotationFilter?: VtgPatternRotationFilter,
): QtrPatternMatch | undefined =>
  [
    ...preferUnrotatedMatches(
      findQtrPatternMatchesInternal(animation, rotationFilter, true, preferences?.orientation),
      preferences,
    ),
  ].sort((first, second) => {
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
