import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  createVtgAnimationSignature,
  getVtgAnimationScale,
} from '@/features/vtg/math/createVtgAnimationSignature'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import {
  doubleAnimationPlayback,
  doublePlaybackMultiplier,
} from '@/math/animation/subdivideAnimationPlayback'
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
  return findBaseVtgPatternMatches(animation)
}

const transformationCount = (match: VtgPatternMatch) =>
  Number((match.beat ?? 1) !== 1) + Number(match.double === true)

/**
 * Prefers the original playback when a shifted or doubled candidate is also
 * byte-for-byte equivalent, while retaining the established catalog order for
 * all other equivalent representations.
 */
export const findVtgPatternMatch = (animation: RootDataFinal): VtgPatternMatch | undefined =>
  [...findVtgPatternMatches(animation)].sort(
    (first, second) => transformationCount(first) - transformationCount(second),
  )[0]

export const matchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  if (!candidate) return false

  return createVtgAnimationSignature(animation) === createVtgAnimationSignature(candidate)
}
