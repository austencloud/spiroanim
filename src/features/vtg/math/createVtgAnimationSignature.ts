import { reverseAngle } from '@/math/animation/AngleFunc'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

const normalizePlane = (angle: number | undefined) => {
  if (angle === undefined) return null
  const normalized = ((angle % 360) + 360) % 360
  return Object.is(normalized, -0) ? 0 : normalized
}

const frameSignature = (frame: AnimData, reversePlane = false) => [
  frame.turns ?? null,
  frame.arc ?? null,
  normalizePlane(reversePlane ? reverseAngle(frame.plane ?? 0) : frame.plane),
  normalizePlane(reversePlane && frame.axis !== undefined ? reverseAngle(frame.axis) : frame.axis),
]

export const createVtgAnimationSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined
  return JSON.stringify(
    animation.props.map((prop) => prop.anim.map((frame) => frameSignature(frame))),
  )
}

/** Produces the same signature as applying shared final transforms without cloning the animation. */
export const createFinalTransformedVtgAnimationSignature = (
  animation: RootDataFinal,
  transforms: { swapProps: boolean; reversePlane: boolean },
): string | undefined => {
  if (animation.props.length !== 2) return undefined

  return JSON.stringify(
    animation.props.map((_, outputIndex) => {
      const sourceIndex = transforms.swapProps ? 1 - outputIndex : outputIndex
      const source = animation.props[sourceIndex]
      return source?.anim.map((frame, frameIndex) =>
        frameSignature(frame, transforms.reversePlane && frameIndex === 0),
      )
    }),
  )
}

export const getVtgAnimationScale = (animation: RootDataFinal): number | undefined => {
  const firstScale = animation.props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}
