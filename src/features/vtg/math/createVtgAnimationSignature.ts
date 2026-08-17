import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

type CompiledTrackSignature = readonly (readonly number[])[]

const signatureCache = new WeakMap<RootDataFinal, Map<string, readonly CompiledTrackSignature[]>>()
const coordinatePrecision = 1e9

const normalizeCoordinate = (value: number) => {
  const normalized = Math.round(value * coordinatePrecision) / coordinatePrecision
  return Object.is(normalized, -0) ? 0 : normalized
}

const applyInitialTurnsOffset = (animation: RootDataFinal, initialTurnsOffset: number) =>
  initialTurnsOffset === 0
    ? animation
    : {
        ...animation,
        props: animation.props.map((prop) => {
          const firstFrame = prop.anim[0]
          return firstFrame
            ? {
                ...prop,
                anim: [
                  { ...firstFrame, turns: (firstFrame.turns ?? 0) + initialTurnsOffset },
                  ...prop.anim.slice(1),
                ],
              }
            : prop
        }),
      }

const hasUnsupportedPatternFields = (animation: RootDataFinal) =>
  animation.type !== 0 ||
  animation.props.some((prop) =>
    prop.anim.some((frame) => frame.type !== undefined || frame.adjust !== undefined),
  )

const createCompiledTrackSignatures = (
  animation: RootDataFinal,
  reversePlane: boolean,
  initialTurnsOffset: number,
): readonly CompiledTrackSignature[] => {
  const cacheKey = `${Number(reversePlane)}:${initialTurnsOffset}`
  const cached = signatureCache.get(animation)?.get(cacheKey)
  if (cached) return cached

  const transformed = applyInitialTurnsOffset(
    applyPatternFinalTransforms(animation, { reversePlane }),
    initialTurnsOffset,
  )
  const tracks = rootCompile(transformed).props.map((prop) =>
    prop.anim.map((frame) => [...frame.pos, ...frame.rot].map(normalizeCoordinate)),
  )
  const animationCache = signatureCache.get(animation) ?? new Map()
  animationCache.set(cacheKey, tracks)
  signatureCache.set(animation, animationCache)
  return tracks
}

export const createVtgAnimationSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2 || hasUnsupportedPatternFields(animation)) return undefined

  return JSON.stringify(createCompiledTrackSignatures(animation, false, 0))
}

/** Produces the same signature as applying shared final transforms without cloning the animation. */
export const createFinalTransformedVtgAnimationSignature = (
  animation: RootDataFinal,
  transforms: {
    swapProps: boolean
    reversePlane: boolean
    initialTurnsOffset?: number
  },
): string | undefined => {
  if (animation.props.length !== 2 || hasUnsupportedPatternFields(animation)) return undefined

  const tracks = createCompiledTrackSignatures(
    animation,
    transforms.reversePlane,
    transforms.initialTurnsOffset ?? 0,
  )
  return JSON.stringify(transforms.swapProps ? [tracks[1], tracks[0]] : tracks)
}

export const getVtgAnimationScale = (animation: RootDataFinal): number | undefined => {
  // A shifted frame may omit Scale when it inherits the internal default of 10.
  const firstScale =
    animation.props[0]?.anim[0]?.scale ?? rootCompile(animation).props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}
