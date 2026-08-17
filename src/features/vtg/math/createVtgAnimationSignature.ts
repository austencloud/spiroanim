import type { AnimData, RootDataFinal } from '@/types/AnimTypes'
import { reverseAngle } from '@/math/animation/AngleFunc'
import { rootCompile } from '@/math/animation/AnimFunc'

const normalizePlane = (angle: number) => {
  const normalized = ((angle % 360) + 360) % 360
  return Object.is(normalized, -0) ? 0 : normalized
}

const trackSignature = (
  frames: readonly AnimData[],
  reverseInitialPlane = false,
  initialTurnsOffset = 0,
) => {
  let inheritedTurns = 0
  let inheritedArc = 0

  return frames.map((frame, frameIndex) => {
    inheritedTurns = frame.turns ?? inheritedTurns
    if (frameIndex === 0) inheritedTurns += initialTurnsOffset
    inheritedArc = frame.arc ?? inheritedArc
    const plane = frame.plane ?? 0
    const axis = frame.axis ?? plane
    const reversePlane = reverseInitialPlane && frameIndex === 0

    return [
      inheritedTurns,
      inheritedArc,
      normalizePlane(reversePlane ? reverseAngle(plane) : plane),
      normalizePlane(reversePlane ? reverseAngle(axis) : axis),
    ]
  })
}

export const createVtgAnimationSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined

  return JSON.stringify(animation.props.map((prop) => trackSignature(prop.anim)))
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
  if (animation.props.length !== 2) return undefined

  return JSON.stringify(
    animation.props.map((_, outputIndex) => {
      const sourceIndex = transforms.swapProps ? 1 - outputIndex : outputIndex
      const source = animation.props[sourceIndex]
      return source
        ? trackSignature(source.anim, transforms.reversePlane, transforms.initialTurnsOffset)
        : undefined
    }),
  )
}

export const getVtgAnimationScale = (animation: RootDataFinal): number | undefined => {
  // A shifted frame may omit Scale when it inherits the internal default of 10.
  const firstScale =
    animation.props[0]?.anim[0]?.scale ?? rootCompile(animation).props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}
