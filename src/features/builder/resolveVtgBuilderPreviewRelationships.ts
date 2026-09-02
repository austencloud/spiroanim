import {
  describePatternSelectionRelationshipsAcrossBeats,
  isPatternPropTimingBeatInvariant,
} from '@/features/concepts/math/describePatternSelectionRelationships'
import {
  createPatternRelationships,
  describePatternRelationships,
  type PatternRelationships,
} from '@/features/concepts/math/describePatternRelationships'
import { resizeVtgTransitionPatternPreview } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { getVtgQuickSlotBeatCount } from '@/features/vtg/math/getVtgQuickSlotBeatCount'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'
import type { QtrPatternMatch, VtgPatternMatch } from '@/features/vtg/types'

export interface VtgBuilderPreviewDetails {
  relationships: PatternRelationships
  match: VtgPatternMatch | QtrPatternMatch
}

export const resolveVtgBuilderPreviewDetails = async (
  previews: readonly RootDataFinal[],
  matchVtg: PatternMatchingClient['matchVtg'],
  source?: 'vtg' | 'qtr',
): Promise<readonly VtgBuilderPreviewDetails[] | undefined> => {
  const details = await Promise.all(
    previews.map(async (preview) => {
      const candidate =
        resizeVtgTransitionPatternPreview(preview, 0, getVtgQuickSlotBeatCount(preview)) ?? preview
      const result = await matchVtg({
        animation: candidate,
        preferences: { swapProps: false, reversePlane: false, quarters: 1 },
        ...(source ? { source } : undefined),
      })
      if (result.status !== 'matched') return undefined

      const { match } = result
      const catalogRelationships = describePatternSelectionRelationshipsAcrossBeats({
        reference: match.reference,
        speedRatio: match.speedRatio,
        isAnti: match.isAnti,
        swapProps: match.swapProps,
        reversePlane: match.reversePlane,
        ...('quarters' in match ? { quarters: match.quarters } : undefined),
      })
      const actualRelationships = describePatternRelationships(candidate)
      const actualProps =
        actualRelationships.props &&
        isPatternPropTimingBeatInvariant(match.speedRatio, actualRelationships.props.timing)
          ? actualRelationships.props
          : undefined
      return {
        match,
        // Starting-beat shifts can change the compiled hand checkpoint, so hands retain the
        // canonical catalog relationship. Prop rotation offsets are part of the actual portion
        // geometry and must be classified from that geometry instead of from an ambiguous match.
        relationships: createPatternRelationships(catalogRelationships.hands, actualProps),
      }
    }),
  )

  const resolved: VtgBuilderPreviewDetails[] = []
  for (const detail of details) {
    if (!detail) return undefined
    resolved.push(detail)
  }
  return resolved
}

/** Resolves Builder labels from the same catalog selections used to label VTG cells. */
export const resolveVtgBuilderPreviewRelationships = async (
  previews: readonly RootDataFinal[],
  matchVtg: PatternMatchingClient['matchVtg'],
  source?: 'vtg' | 'qtr',
): Promise<readonly PatternRelationships[] | undefined> =>
  (await resolveVtgBuilderPreviewDetails(previews, matchVtg, source))?.map(
    ({ relationships }) => relationships,
  )
