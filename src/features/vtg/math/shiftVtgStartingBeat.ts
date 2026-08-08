import type { VtgBeat } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies the editor's SHIFT operation until the selected VTG beat becomes beat 1. */
export const shiftVtgStartingBeat = (
  animation: RootDataFinal,
  beat: VtgBeat,
): RootDataFinal | undefined => {
  let shiftedAnimation = animation

  for (let shiftCount = 1; shiftCount < beat; shiftCount += 1) {
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
