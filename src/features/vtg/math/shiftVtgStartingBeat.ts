import type { VtgBeat } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies the requested semantic Shift offset to a closed VTG/QTR animation in one pass. */
export const shiftVtgStartingFrames = (
  animation: RootDataFinal,
  shiftCount: number,
): RootDataFinal | undefined => {
  const compiled = rootCompile(animation)
  const shiftedProps = []
  for (const [propIndex, prop] of animation.props.entries()) {
    const compiledProp = compiled.props[propIndex]
    if (!compiledProp) return undefined
    const shiftedFrames = shiftAnimationFrames(prop.anim, compiledProp.anim, shiftCount)
    if (!shiftedFrames) return undefined
    shiftedProps.push({ ...prop, anim: shiftedFrames })
  }
  return { ...animation, props: shiftedProps }
}

/** Applies Shift until the selected VTG/QTR beat becomes beat 1. */
export const shiftVtgStartingBeat = (
  animation: RootDataFinal,
  beat: VtgBeat,
): RootDataFinal | undefined => shiftVtgStartingFrames(animation, (beat - 1) * 2)
