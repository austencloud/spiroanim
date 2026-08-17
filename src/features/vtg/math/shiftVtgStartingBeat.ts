import type { VtgBeat } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies the requested number of semantic Shift operations to a closed VTG/QTR animation. */
export const shiftVtgStartingFrames = (
  animation: RootDataFinal,
  shiftCount: number,
): RootDataFinal | undefined => {
  let shiftedAnimation = animation

  for (let completedShifts = 0; completedShifts < shiftCount; completedShifts += 1) {
    const compiled = rootCompile(shiftedAnimation)
    const shiftedProps = []

    for (const [propIndex, prop] of shiftedAnimation.props.entries()) {
      const compiledProp = compiled.props[propIndex]
      if (!compiledProp) return undefined

      const shiftedFrames = shiftAnimationFrames(prop.anim, compiledProp.anim)
      if (!shiftedFrames) return undefined
      shiftedProps.push({ ...prop, anim: shiftedFrames })
    }

    shiftedAnimation = { ...shiftedAnimation, props: shiftedProps }
  }

  return shiftedAnimation
}

/** Applies Shift until the selected VTG/QTR beat becomes beat 1. */
export const shiftVtgStartingBeat = (
  animation: RootDataFinal,
  beat: VtgBeat,
): RootDataFinal | undefined => shiftVtgStartingFrames(animation, (beat - 1) * 2)
