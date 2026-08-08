import { createDefaultQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { qtrBeats } from '@/features/qtr/types'
import type { QtrPatternMatch, QtrPatternSelection } from '@/features/qtr/types'
import type { VtgCellReference, VtgRuleNumber } from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type QtrCandidateMatch = Omit<QtrPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly QtrCandidateMatch[]> | undefined

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const roundNumber = (value: number) => {
  const rounded = Math.round(value * 1e9) / 1e9
  return Object.is(rounded, -0) ? 0 : rounded
}

const normalizeAngle = (value: number) => roundNumber(((value % 360) + 360) % 360)

const frameSignature = (frame: AnimDataCompiled) => [
  roundNumber(frame.turns),
  roundNumber(frame.arc),
  normalizeAngle(frame.plane),
  normalizeAngle(frame.axis),
  roundNumber(frame.adjust),
  frame.type,
]

const createSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined

  try {
    return JSON.stringify(rootCompile(animation).props.map((prop) => prop.anim.map(frameSignature)))
  } catch {
    return undefined
  }
}

const getScale = (animation: RootDataFinal): number | undefined => {
  const firstScale = animation.props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}

const buildCandidateCache = () => {
  const candidates = new Map<string, QtrCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

      for (const speedRatio of vtgSpeedRatios) {
        for (const isAnti of antiOptions) {
          for (const shape of patternShapes) {
            for (const swapProps of booleanOptions) {
              for (const reversePlane of booleanOptions) {
                for (const beat of qtrBeats) {
                  const selection: QtrPatternSelection = {
                    reference,
                    speedRatio,
                    isAnti,
                    swapProps,
                    reversePlane,
                    quarters: 1,
                    beat,
                    ...(shape === 'box' ? { shape } : undefined),
                  }
                  const animation = createDefaultQtrAnimation(selection)
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
                    quarters: 1,
                    beat,
                    ...(shape === 'box' ? { shape } : undefined),
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

  candidateCache = candidates
  return candidates
}

export const findQtrPatternMatches = (animation: RootDataFinal): readonly QtrPatternMatch[] => {
  const signature = createSignature(animation)
  const scale = getScale(animation)
  if (!signature || scale === undefined) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: animation.bpm,
    scale,
  }))
}

export const findQtrPatternMatch = (animation: RootDataFinal): QtrPatternMatch | undefined =>
  findQtrPatternMatches(animation)[0]

export const matchesQtrSelection = (
  animation: RootDataFinal,
  selection: QtrPatternSelection,
): boolean => {
  const candidate = createDefaultQtrAnimation(selection)
  return candidate !== undefined && createSignature(animation) === createSignature(candidate)
}
