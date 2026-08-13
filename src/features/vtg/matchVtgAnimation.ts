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
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import { supportsVtgQtrTransition } from '@/features/vtg/types'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import { analyzeAlternatingPatternPlayback } from '@/math/animation/alternatePatternPlayback'
import type { RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly VtgCandidateMatch[]> | undefined

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

const buildCandidateCache = () => {
  const candidates = new Map<string, VtgCandidateMatch[]>()

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
            const baseSelection: VtgPatternSelection = {
              reference,
              speedRatio,
              isAnti,
              ...(shape === 'box' ? { shape } : undefined),
            }
            const baseAnimation = createDefaultVtgAnimation(baseSelection)
            if (!baseAnimation) continue

            const playbackAnimations = new Map<
              VtgPatternSelection['beat'],
              readonly [RootDataFinal | undefined, RootDataFinal | undefined]
            >()

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
                    playback = [
                      applyVtgPlaybackControls(baseAnimation, { speedRatio, beat }),
                      applyVtgPlaybackControls(baseAnimation, {
                        speedRatio,
                        beat,
                        double: true,
                      }),
                    ]
                    playbackAnimations.set(beat, playback)
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

const findBaseVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  const scale = getVtgAnimationScale(animation)
  if (scale === undefined) return []

  const signature = createVtgAnimationSignature(animation)
  if (!signature) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: candidate.double ? animation.bpm / doublePlaybackMultiplier : animation.bpm,
    scale,
  }))
}

export const findVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  const alternating = analyzeAlternatingPatternPlayback(animation)
  if (!alternating) return findBaseVtgPatternMatches(animation)

  return findBaseVtgPatternMatches(alternating.base)
    .filter((match) => match.double && supportsVtgQtrTransition(match.speedRatio))
    .map((match) => ({
      ...match,
      transition: true,
      transitionBeats: alternating.transitionBeats,
    }))
}

const startingBeat = (match: VtgPatternMatch) => match.beat ?? 1

const playbackTransformationCount = (match: VtgPatternMatch) =>
  Number(match.double === true) + Number(match.transition === true)

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
