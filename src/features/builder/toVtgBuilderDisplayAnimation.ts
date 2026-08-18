import { getVtgDistanceForScale, toVtgInternalScale } from '@/features/vtg/data/vtgPlayerSettings'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Uses the literal Customize Scale for Builder visuals without VTG ratio adjustments. */
export const toVtgBuilderDisplayAnimation = (
  animation: RootDataFinal,
  scale: number,
): RootDataFinal => {
  const internalScale = toVtgInternalScale(scale)
  return {
    ...animation,
    camera: [createDefaultCameraFrame(getVtgDistanceForScale(scale))],
    props: animation.props.map((prop) => ({
      ...prop,
      anim: prop.anim.map((frame) => ({ ...frame, scale: internalScale })),
    })),
  }
}
