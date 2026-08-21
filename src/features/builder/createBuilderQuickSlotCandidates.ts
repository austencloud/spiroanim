import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getVtgQuickSlotBeatCount } from '@/features/vtg/math/getVtgQuickSlotBeatCount'
import type { RootDataFinal } from '@/types/AnimTypes'

/** Keeps the complete Builder pattern first and normalizes each slot to its complete timing cycle. */
export const createBuilderQuickSlotCandidates = (
  currentPattern: RootDataFinal,
  previews: readonly RootDataFinal[],
): readonly RootDataFinal[] => [
  currentPattern,
  ...previews.map(
    (preview) =>
      resizeVtgTransitionPatternPreview(preview, 0, getVtgQuickSlotBeatCount(preview)) ?? preview,
  ),
]
