import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { qtrModes } from '@/features/qtr/types'
import type {
  QtrPatternMatch,
  QtrPatternMatchPreferences,
  QtrPatternSelection,
} from '@/features/qtr/types'
import {
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import type { VtgCellReference, VtgRuleNumber } from '@/features/vtg/types'
import { supportsVtgQtrTransition, vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
import { getAlternatingPatternBase } from '@/math/animation/alternatePatternPlayback'
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
  animation: RootDataFinal,
  candidate: QtrCandidateMatch,
) => {
  const signature = createVtgAnimationSignature(animation)
  if (!signature) return

  const matches = candidates.get(signature) ?? []
  matches.push(candidate)
  candidates.set(signature, matches)
}

const buildCandidateCache = () => {
  const candidates = new Map<string, QtrCandidateMatch[]>()

  for (const quarters of qtrModes) {
    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = createCellReference(column, row)
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

        for (const speedRatio of vtgSpeedRatios) {
          for (const isAnti of antiOptions) {
            for (const shape of patternShapes) {
              for (const swapProps of booleanOptions) {
                for (const reversePlane of booleanOptions) {
                  const selection: QtrPatternSelection = {
                    reference,
                    speedRatio,
                    quarters,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(shape === 'box' ? { shape } : undefined),
                  }
                  let shifted = createDefaultQtrAnimation(selection)
                  if (!shifted) continue

                  for (const beat of vtgBeats) {
                    if (beat > 1) {
                      shifted = shiftVtgStartingBeat(shifted, 2)
                      if (!shifted) break
                    }

                    const candidate: QtrCandidateMatch = {
                      reference,
                      speedRatio,
                      quarters,
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
  }

  candidateCache = candidates
  return candidates
}

export const findQtrPatternMatches = (animation: RootDataFinal): readonly QtrPatternMatch[] => {
  const alternatingBase = getAlternatingPatternBase(animation)
  const matchingAnimation = alternatingBase ?? animation
  const scale = getVtgAnimationScale(matchingAnimation)
  if (scale === undefined) return []

  const signature = createVtgAnimationSignature(matchingAnimation)
  if (!signature) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? [])
    .filter(
      (candidate) =>
        !alternatingBase || (candidate.double && supportsVtgQtrTransition(candidate.speedRatio)),
    )
    .map((candidate) => ({
      ...candidate,
      ...(alternatingBase ? { transition: true } : undefined),
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
  Number(match.quarters !== preferences.quarters) +
  Number(match.swapProps !== preferences.swapProps) +
  Number(match.reversePlane !== preferences.reversePlane)

export const findQtrPatternMatch = (
  animation: RootDataFinal,
  preferences?: QtrPatternMatchPreferences,
): QtrPatternMatch | undefined =>
  [...findQtrPatternMatches(animation)].sort((first, second) => {
    const beatDifference = startingBeat(first) - startingBeat(second)
    if (beatDifference !== 0) return beatDifference

    if (preferences) {
      const preferenceDifference =
        preferenceDifferenceCount(first, preferences) -
        preferenceDifferenceCount(second, preferences)
      if (preferenceDifference !== 0) return preferenceDifference
    }

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
