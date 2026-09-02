import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import type { PatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import { markBeatVaryingTiming } from '@/features/concepts/math/describePatternSelectionRelationships'
import { inferVtgDoubledPortionSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import type { VtgSpeedRatio } from '@/features/vtg/types'
import type { RootDataFinal } from '@/types/AnimTypes'

const minimumRelationshipFrameCount = 3

/** Provides enough inherited motion for a shortened portion to reach the label checkpoint. */
const extendVtgBuilderRelationshipFrames = (animation: RootDataFinal): RootDataFinal => ({
  ...animation,
  props: animation.props.map((prop) => ({
    ...prop,
    anim:
      prop.anim.length >= minimumRelationshipFrameCount
        ? prop.anim
        : [
            ...prop.anim.map((frame) => ({ ...frame })),
            ...Array.from({ length: minimumRelationshipFrameCount - prop.anim.length }, () => ({})),
          ],
  })),
})

/** Describes one Builder portion directly from its compiled geometry. */
export const describeVtgBuilderPreviewRelationship = (
  preview: RootDataFinal,
  speedRatio: VtgSpeedRatio | undefined = inferVtgDoubledPortionSpeedRatio(preview),
): PatternRelationships => {
  const relationships = describePatternRelationships(extendVtgBuilderRelationshipFrames(preview))
  return speedRatio ? markBeatVaryingTiming(relationships, speedRatio) : relationships
}

/** Describes Builder portions without rematching them to the VTG or QTR catalogs. */
export const describeVtgBuilderPreviewRelationships = (
  previews: readonly RootDataFinal[],
): readonly PatternRelationships[] =>
  previews.map((preview) => describeVtgBuilderPreviewRelationship(preview))
