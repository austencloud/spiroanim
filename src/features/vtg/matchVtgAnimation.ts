import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  getVtgDistanceForScale,
  vtgBpmControl,
  vtgScaleControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import type {
  VtgCellReference,
  VtgPatternMatch,
  VtgPatternSelection,
  VtgRuleNumber,
} from '@/features/vtg/types'
import { vtgSpeedRatios } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimDataCompiled, RootDataCompiled, RootDataFinal } from '@/types/AnimTypes'

const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
const booleanOptions = [false, true] as const
const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

type VtgCandidateMatch = Omit<VtgPatternMatch, 'bpm'>

const candidateCache = new Map<number, ReadonlyMap<string, readonly VtgCandidateMatch[]>>()

const createCellReference = (column: VtgRuleNumber, row: VtgRuleNumber): VtgCellReference =>
  `${column}-${row}`

const normalizePlane = (angle: number) => {
  const normalized = ((angle % 360) + 360) % 360
  return Object.is(normalized, -0) ? 0 : normalized
}

const frameSignature = (frame: AnimDataCompiled) => [
  frame.turns,
  frame.beats,
  frame.scale,
  frame.depth,
  frame.type,
  frame.adjust,
  frame.arc,
  normalizePlane(frame.plane),
  normalizePlane(frame.axis),
  frame.move,
]

const rootSignature = (animation: RootDataCompiled) =>
  JSON.stringify({
    root: [
      animation.speed,
      animation.type,
      animation.turns,
      animation.depth,
      animation.prop,
      animation.color,
      animation.guides,
      animation.paths,
      animation.hands,
      animation.visible,
      animation.nodes,
      animation.anchors,
      animation.aspectx,
      animation.aspecty,
      animation.thick,
    ],
    props: animation.props.map((prop) => [
      prop.color,
      prop.prop,
      prop.guides,
      prop.paths,
      prop.hands,
      prop.visible,
      prop.nodes,
      prop.anchors,
      prop.thick,
      prop.anim.map(frameSignature),
    ]),
  })

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
  const secondScale = animation.props[1]?.anim[0]?.scale
  if (firstScale === undefined || firstScale !== secondScale || !Number.isInteger(firstScale))
    return undefined

  const scale = firstScale / 10
  if (scale < vtgScaleControl.min || scale > vtgScaleControl.max) return undefined
  return scale
}

const hasSupportedDistance = (animation: RootDataFinal, scale: number) => {
  const expected = getVtgDistanceForScale(scale)

  // Query-string v1 stores Distance as an integer, so fractional VTG distances
  // are truncated when a shared URL is decoded.
  return animation.distance === expected || animation.distance === Math.trunc(expected)
}

const hasSupportedBpm = (bpm: number) =>
  Number.isInteger(bpm) && bpm >= vtgBpmControl.min && bpm <= vtgBpmControl.max

const buildCandidateCache = (scale: number) => {
  const candidates = new Map<string, VtgCandidateMatch[]>()

  for (const column of ruleNumbers) {
    for (const row of ruleNumbers) {
      const reference = createCellReference(column, row)
      const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)

      for (const speedRatio of vtgSpeedRatios) {
        for (const isAnti of antiOptions) {
          for (const swapProps of booleanOptions) {
            for (const reversePlane of booleanOptions) {
              const selection: VtgPatternSelection = {
                reference,
                speedRatio,
                isAnti,
                swapProps,
                reversePlane,
                scale,
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
                scale,
              })
              candidates.set(signature, matches)
            }
          }
        }
      }
    }
  }

  candidateCache.set(scale, candidates)
  return candidates
}

export const findVtgPatternMatches = (animation: RootDataFinal): readonly VtgPatternMatch[] => {
  const scale = getScale(animation)
  if (
    scale === undefined ||
    !hasSupportedDistance(animation, scale) ||
    !hasSupportedBpm(animation.bpm)
  )
    return []

  const signature = createSignature(animation)
  if (!signature) return []

  const candidates = candidateCache.get(scale) ?? buildCandidateCache(scale)
  return (candidates.get(signature) ?? []).map((candidate) => ({
    ...candidate,
    bpm: animation.bpm,
  }))
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
  const candidate = createDefaultVtgAnimation({
    ...selection,
    bpm: animation.bpm,
    scale: selection.scale ?? getScale(animation),
  })
  if (!candidate || !hasSupportedDistance(animation, getScale(candidate) ?? 0)) return false

  return createSignature(animation) === createSignature(candidate)
}
