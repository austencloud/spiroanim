import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataCompiled, RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly VtgCandidateMatch[]> | undefined

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const normalizePlane = (angle: number) => {
  const normalized = ((angle % 360) + 360) % 360
  return Object.is(normalized, -0) ? 0 : normalized
}

const frameSignature = (frame: AnimDataCompiled) => [
  frame.turns,
  frame.arc,
  normalizePlane(frame.plane),
]

const rootSignature = (animation: RootDataCompiled) =>
  JSON.stringify(animation.props.map((prop) => prop.anim.map(frameSignature)))

const timingTolerance = 0.000_001

const vectorsAreParallel = (first: readonly number[], second: readonly number[]) => {
  if (first.length !== 3 || second.length !== 3) return false
  const dot = first[0]! * second[0]! + first[1]! * second[1]! + first[2]! * second[2]!
  return Math.abs(Math.abs(dot) - 1) <= timingTolerance
}

const hasVtgTiming = (animation: RootDataCompiled) => {
  const first = animation.props[0]?.anim[1]
  const second = animation.props[1]?.anim[1]
  return (
    first !== undefined &&
    second !== undefined &&
    vectorsAreParallel(first.pos, second.pos) &&
    vectorsAreParallel(first.rot, second.rot)
  )
}

const createSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined

  try {
    const compiled = rootCompile(animation)
    return hasVtgTiming(compiled) ? rootSignature(compiled) : undefined
  } catch {
    return undefined
  }
}

const getScale = (animation: RootDataFinal): number | undefined => {
  const firstScale = animation.props[0]?.anim[0]?.scale
  if (firstScale === undefined) return undefined

  return firstScale / 10
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
                for (const beat of vtgBeats) {
                  const selection: VtgPatternSelection = {
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(shape === 'box' ? { shape } : undefined),
                    ...(beat === 1 ? undefined : { beat }),
                  }
                  const animation = createDefaultVtgAnimation(selection)
                  if (!animation) continue

                  const signature = createSignature(animation)
                  if (!signature) continue

                  const matches = candidates.get(signature) ?? []
                  matches.push({
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    ...(shape === 'box' ? { shape } : undefined),
                    ...(beat === 1 ? undefined : { beat }),
                  })
                  candidates.set(signature, matches)
                }
              }
            }
          }
        }
      }
    }
  }

  for (const matches of candidates.values()) {
    matches.sort((first, second) => (first.beat ?? 1) - (second.beat ?? 1))
  }

  candidateCache = candidates
  return candidates
}

const findBaseVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  const scale = getScale(animation)
  if (scale === undefined) return []

  const signature = createSignature(animation)
  if (!signature) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: animation.bpm,
    scale,
  }))
}

export const findVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  return findBaseVtgPatternMatches(animation)
}

/**
 * Returns the least-transformed representation when several controls produce
 * byte-for-byte equivalent animation data.
 */
export const findVtgPatternMatch = (animation: RootDataFinal): VtgPatternMatch | undefined =>
  findVtgPatternMatches(animation)[0]

export const matchesVtgSelection = (
  animation: RootDataFinal,
  selection: VtgPatternSelection,
): boolean => {
  const candidate = createDefaultVtgAnimation(selection)
  if (!candidate) return false

  return createSignature(animation) === createSignature(candidate)
}
