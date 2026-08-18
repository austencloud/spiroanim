import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import type { RootDataFinal } from '@/types/AnimTypes'

const quickSlotPatternBeatCount = 4

/** Keeps the complete Builder pattern first and normalizes every extracted slot to four beats. */
export const createBuilderQuickSlotCandidates = (
  currentPattern: RootDataFinal,
  previews: readonly RootDataFinal[],
): readonly RootDataFinal[] => [
  currentPattern,
  ...previews.map(
    (preview) =>
      resizeVtgTransitionPatternPreview(preview, 0, quickSlotPatternBeatCount) ?? preview,
  ),
]
