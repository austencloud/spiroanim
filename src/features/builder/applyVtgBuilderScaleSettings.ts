import type { VtgBuilderScaleMode, VtgBuilderScaleValues } from '@/features/builder/types'
import type { RootDataFinal } from '@/types/AnimTypes'

export interface ApplyVtgBuilderScaleSettingsOptions {
  firstEditableFrameIndex?: number
}

/** Applies Builder Scale settings without mutating the selected portion. */
export const applyVtgBuilderScaleSettings = (
  animation: RootDataFinal,
  mode: VtgBuilderScaleMode,
  values: VtgBuilderScaleValues,
  options: ApplyVtgBuilderScaleSettingsOptions = {},
): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop, propIndex) => {
    let beat = 0
    const firstEditableFrameIndex = options.firstEditableFrameIndex ?? 0
    return {
      ...prop,
      anim: prop.anim.map((frame, frameIndex) => {
        const nextFrame = { ...frame }
        if (frameIndex < firstEditableFrameIndex) {
          beat += frame.beats ?? 0.5
          return nextFrame
        }

        delete nextFrame.scale
        const value = values[propIndex]?.[String(beat)]
        if (
          (mode === 'advanced' || frameIndex === firstEditableFrameIndex) &&
          value !== undefined
        ) {
          nextFrame.scale = Math.round(value * 10)
        }
        beat += frame.beats ?? 0.5
        return nextFrame
      }),
    }
  }),
})
