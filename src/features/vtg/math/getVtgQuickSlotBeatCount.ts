import { inferVtgSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import { getVtgTimingCycleCount } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const beatsPerHandRotation = 4

/** Keeps a complete timing cycle when normalizing VTG and Builder Quick Slots. */
export const getVtgQuickSlotBeatCount = (animation: RootDataFinal): number => {
  const speedRatio = inferVtgSpeedRatio(animation)
  return speedRatio === undefined
    ? beatsPerHandRotation
    : getVtgTimingCycleCount(speedRatio) * beatsPerHandRotation
}
