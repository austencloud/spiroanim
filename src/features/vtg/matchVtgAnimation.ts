import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternMatchPreferences,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
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

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly VtgCandidateMatch[]> | undefined

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const addCandidate = (
  candidates: Map<string, VtgCandidateMatch[]>,
  animation: RootDataFinal,
  candidate: VtgCandidateMatch,
) => {
  const signature = createVtgAnimationSignature(animation)
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

      for (const speedRatio of vtgSpeedRatios) {
        for (const isAnti of antiOptions) {
          for (const shape of patternShapes) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                const selection: VtgPatternSelection = {
                  reference,
                  speedRatio,
                  isAnti,
                  swapProps,
                  reversePlane,
                  ...(shape === 'box' ? { shape } : undefined),
                }
                let shifted = createDefaultVtgAnimation(selection)
                if (!shifted) continue

                for (const beat of vtgBeats) {
                  if (beat > 1) {
                    shifted = shiftVtgStartingBeat(shifted, 2)
                    if (!shifted) break
                  }

                  const candidate: VtgCandidateMatch = {
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(beat === 1 ? undefined : { beat }),
                    ...(shape === 'box' ? { shape } : undefined),
                  }
                  addCandidate(candidates, shifted, candidate)

                  const doubled = doubleAnimationPlayback(shifted)
                  if (doubled) {
                    addCandidate(candidates, doubled, {
                      ...candidate,
                      double: true,
                    })
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
