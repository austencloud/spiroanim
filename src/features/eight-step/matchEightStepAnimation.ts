import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import { eightStepPatternDefinitions } from '@/features/eight-step/data/eightStepPatternDefinitions'
import type { EightStepPatternMatch, EightStepPatternSelection } from '@/features/eight-step/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataCompiled, RootDataFinal } from '@/types/AnimTypes'

const booleanOptions = [false, true] as const

type EightStepCandidateMatch = Omit<EightStepPatternMatch, 'bpm' | 'scale'>

let candidateCache: ReadonlyMap<string, readonly EightStepCandidateMatch[]> | undefined

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

const createSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined

  try {
    return rootSignature(rootCompile(animation))
  } catch {
    return undefined
  }
}

const getScale = (animation: RootDataFinal): number | undefined => {
  const firstScale = animation.props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}

const buildCandidateCache = () => {
  const candidates = new Map<string, EightStepCandidateMatch[]>()

  for (const definition of eightStepPatternDefinitions) {
    for (const swapProps of booleanOptions) {
      for (const reversePlane of booleanOptions) {
        const selection: EightStepPatternSelection = {
          concept: '8stp',
          reference: definition.reference,
          swapProps,
          reversePlane,
        }
        const animation = createDefaultEightStepAnimation(selection)
        if (!animation) continue

        const signature = createSignature(animation)
        if (!signature) continue

        const matches = candidates.get(signature) ?? []
        matches.push({ reference: definition.reference, swapProps, reversePlane })
        candidates.set(signature, matches)
      }
    }
  }

  candidateCache = candidates
  return candidates
}

export const findEightStepPatternMatches = (
  animation: RootDataFinal,
): readonly EightStepPatternMatch[] => {
  const scale = getScale(animation)
  const signature = createSignature(animation)
  if (scale === undefined || !signature) return []

  const candidates = candidateCache ?? buildCandidateCache()
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: animation.bpm,
    scale,
  }))
}

export const findEightStepPatternMatch = (
  animation: RootDataFinal,
): EightStepPatternMatch | undefined => findEightStepPatternMatches(animation)[0]

export const matchesEightStepSelection = (
  animation: RootDataFinal,
  selection: EightStepPatternSelection,
): boolean => {
  const candidate = createDefaultEightStepAnimation(selection)
  if (!candidate) return false

  return createSignature(animation) === createSignature(candidate)
}
