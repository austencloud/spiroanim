import type { AnimData, RootDataFinal } from '@/types/AnimTypes'
import type { VtgPatternOrientation } from '@/features/vtg/types'
import { reverseAngle } from '@/math/animation/AngleFunc'

export interface PatternFinalTransformSelection {
  swapProps?: boolean
  reversePlane?: boolean
}

const normalizeAngle = (value: number): number => ((value % 360) + 360) % 360

const shiftInitialArc = (frame: AnimData, angle: number): AnimData => ({
  ...frame,
  arc: normalizeAngle(
    (frame.arc ?? 0) + (normalizeAngle(frame.plane ?? 0) === 180 ? -angle : angle),
  ),
})

/** Rotates the pattern's true starting state before beat and transition playback transforms. */
export const applyPatternInitialArcRotation = (
  animation: RootDataFinal,
  orientation: VtgPatternOrientation = 0,
): RootDataFinal =>
  orientation === 0
    ? animation
    : transformInitialFrames(animation, (frame) => shiftInitialArc(frame, orientation))

const transformInitialFrames = (
  animation: RootDataFinal,
  transform: (frame: AnimData) => AnimData,
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop) => {
    const firstFrame = prop.anim[0]
    if (!firstFrame) return prop

    return {
      ...prop,
      anim: [transform(firstFrame), ...prop.anim.slice(1)],
    }
  }),
})

const reverseInitialPlane = (frame: AnimData): AnimData => ({
  ...frame,
  plane: reverseAngle(frame.plane ?? 0),
  ...(frame.axis === undefined ? undefined : { axis: reverseAngle(frame.axis) }),
})

/** Exchanges animation tracks while keeping colors, visibility, spacing, and other prop-slot settings fixed. */
const swapAnimationTracks = (animation: RootDataFinal): RootDataFinal => {
  if (animation.props.length !== 2) return animation

  const firstTrack = animation.props[0]?.anim
  const secondTrack = animation.props[1]?.anim
  if (!firstTrack || !secondTrack) return animation

  return {
    ...animation,
    props: animation.props.map((prop, index) => ({
      ...prop,
      anim: index === 0 ? secondTrack : firstTrack,
    })),
  }
}

/** Applies shared pattern transforms only after concept-specific and playback transforms are complete. */
export const applyPatternFinalTransforms = (
  animation: RootDataFinal,
  selection: PatternFinalTransformSelection,
): RootDataFinal => {
  const reversed = selection.reversePlane
    ? transformInitialFrames(animation, reverseInitialPlane)
    : animation
  return selection.swapProps ? swapAnimationTracks(reversed) : reversed
}
