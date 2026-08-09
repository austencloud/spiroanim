import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

const normalizePlane = (angle: number | undefined) => {
  if (angle === undefined) return null
  const normalized = ((angle % 360) + 360) % 360
  return Object.is(normalized, -0) ? 0 : normalized
}

const frameSignature = (frame: AnimData) => [
  frame.turns ?? null,
  frame.arc ?? null,
  normalizePlane(frame.plane),
  normalizePlane(frame.axis),
]

export const createVtgAnimationSignature = (animation: RootDataFinal): string | undefined => {
  if (animation.props.length !== 2) return undefined
  return JSON.stringify(animation.props.map((prop) => prop.anim.map(frameSignature)))
}

export const getVtgAnimationScale = (animation: RootDataFinal): number | undefined => {
  const firstScale = animation.props[0]?.anim[0]?.scale
  return firstScale === undefined ? undefined : firstScale / 10
}
