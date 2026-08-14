import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { vtgCanonicalSpeedRatio } from '@/features/vtg/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'
import { describePatternRelationships } from '@/features/concepts/math/describePatternRelationships'

type MatrixPatternSelection = VtgPatternSelection | QtrPatternSelection

/** Classifies pattern semantics without playback-only Beat and transition transforms. */
export const describePatternSelectionRelationships = (selection: MatrixPatternSelection) => {
  const {
    beat: _beat,
    transition: _transition,
    transitionBeats: _transitionBeats,
    transitionQuad: _transitionQuad,
    transitionSecond: _transitionSecond,
    ...semanticSelection
  } = selection
  // The row catalog stores canonical relationships at the default 1:3 ratio and derives other
  // ratios by transforming turns. Classify that source relationship before the turn transform;
  // an even-ratio second frame lands at a different point in its cycle but does not rename the
  // matrix rule.
  const relationshipSelection = {
    ...semanticSelection,
    speedRatio: vtgCanonicalSpeedRatio,
  } as const
  const animation =
    'quarters' in relationshipSelection
      ? createDefaultQtrAnimation(relationshipSelection)
      : createDefaultVtgAnimation(relationshipSelection)
  if (!animation) throw new Error(`Missing pattern animation for ${selection.reference}`)

  return describePatternRelationships(animation)
}
