import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getVtgQuickSlotBeatCount } from '@/features/vtg/math/getVtgQuickSlotBeatCount'
import type { RootDataFinal } from '@/types/AnimTypes'

export const resolveVtgBuilderPatternMatchAnimation = (
  previews: readonly RootDataFinal[] | undefined,
  selectedIndex: number | undefined,
): RootDataFinal | undefined => {
  if (!previews?.length || selectedIndex === undefined) return undefined
  const preview = selectedIndex === previews.length ? previews.at(-1) : previews[selectedIndex]
  if (!preview) return undefined

  return resizeVtgTransitionPatternPreview(preview, 0, getVtgQuickSlotBeatCount(preview)) ?? preview
}
