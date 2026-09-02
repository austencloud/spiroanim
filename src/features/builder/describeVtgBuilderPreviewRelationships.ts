import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'
import type { PatternRelationships } from '@/features/concepts/math/describePatternRelationships'
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
): PatternRelationships => describePatternRelationships(extendVtgBuilderRelationshipFrames(preview))

/** Describes Builder portions without rematching them to the VTG or QTR catalogs. */
export const describeVtgBuilderPreviewRelationships = (
  previews: readonly RootDataFinal[],
): readonly PatternRelationships[] => previews.map(describeVtgBuilderPreviewRelationship)
