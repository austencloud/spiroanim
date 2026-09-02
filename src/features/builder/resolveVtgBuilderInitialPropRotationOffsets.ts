import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getVtgQuickSlotBeatCount } from '@/features/vtg/math/getVtgQuickSlotBeatCount'
import type { VtgPatternSelection } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

/**
 * Offset is defined relative to a catalog pattern, unlike the portion's geometric relationships.
 * Keep this exceptional lookup isolated from labels and from Builder reconstruction support.
 */
export const resolveVtgBuilderInitialPropRotationOffsets = async (
  preview: RootDataFinal,
  matchVtg: PatternMatchingClient['matchVtg'],
  source?: 'vtg' | 'qtr',
): Promise<VtgPatternSelection['propRotationOffsets']> => {
  const candidate =
    resizeVtgTransitionPatternPreview(preview, 0, getVtgQuickSlotBeatCount(preview)) ?? preview
  const result = await matchVtg({
    animation: candidate,
    preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    ...(source ? { source } : undefined),
  })
  return result.status === 'matched' ? result.match.propRotationOffsets : undefined
}
