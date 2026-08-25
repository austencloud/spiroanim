import type { VtgTwistMode, VtgTwistValues } from '@/features/concepts/stores/useConceptsStore'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Applies persistent generator Twist settings without mutating the generated VTG animation. */
export const applyVtgTwistSettings = (
  animation: RootDataFinal,
  mode: VtgTwistMode,
  values: VtgTwistValues,
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => {
    let beat = 0
    return {
      ...prop,
      anim: prop.anim.map((frame) => {
        const nextFrame = { ...frame }
        delete nextFrame.twist
        const value = values[propIndex]?.[String(beat)]
        if ((mode === 'advanced' || beat === 0.5) && value !== undefined) nextFrame.twist = value
        beat += frame.beats ?? 0.5
        return nextFrame
      }),
    }
  }),
})
