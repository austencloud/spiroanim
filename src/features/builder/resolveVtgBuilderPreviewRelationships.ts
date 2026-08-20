import { describePatternSelectionRelationships } from '@/features/concepts/math/describePatternSelectionRelationships'
import type { PatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const normalizedPreviewBeatCount = 4

/** Resolves Builder labels from the same catalog selections used to label VTG cells. */
export const resolveVtgBuilderPreviewRelationships = async (
  previews: readonly RootDataFinal[],
  matchVtg: PatternMatchingClient['matchVtg'],
): Promise<readonly PatternRelationships[] | undefined> => {
  const relationships = await Promise.all(
    previews.map(async (preview) => {
      const candidate =
        resizeVtgTransitionPatternPreview(preview, 0, normalizedPreviewBeatCount) ?? preview
      const result = await matchVtg({
        animation: candidate,
        preferences: { swapProps: false, reversePlane: false, quarters: 1 },
      })
      if (result.status !== 'matched') return undefined

      const { match } = result
      return describePatternSelectionRelationships({
        reference: match.reference,
        speedRatio: match.speedRatio,
        isAnti: match.isAnti,
        swapProps: match.swapProps,
        reversePlane: match.reversePlane,
        ...('quarters' in match ? { quarters: match.quarters } : undefined),
      })
    }),
  )

  const resolved: PatternRelationships[] = []
  for (const relationship of relationships) {
    if (!relationship) return undefined
    resolved.push(relationship)
  }
  return resolved
}
