import { reverseAngle } from '@/math/animation/AngleFunc'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

export interface PatternFinalTransformSelection {
  swapProps?: boolean
  reversePlane?: boolean
}

const reverseInitialFrame = (frame: AnimData): AnimData => ({
  ...frame,
  plane: reverseAngle(frame.plane ?? 0),
  ...(frame.axis === undefined ? undefined : { axis: reverseAngle(frame.axis) }),
})

const reverseAnimationPlanes = (animation: RootDataFinal): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop) => {
    const firstFrame = prop.anim[0]
    if (!firstFrame) return prop

    return {
      ...prop,
      anim: [reverseInitialFrame(firstFrame), ...prop.anim.slice(1)],
    }
  }),
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
  const reversed = selection.reversePlane ? reverseAnimationPlanes(animation) : animation
  return selection.swapProps ? swapAnimationTracks(reversed) : reversed
}
