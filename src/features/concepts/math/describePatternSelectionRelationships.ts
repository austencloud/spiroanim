import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'
import {
  createPatternRelationshipError,
  describePatternRelationships,
} from '@/features/concepts/math/describePatternRelationships'

type MatrixPatternSelection = VtgPatternSelection | QtrPatternSelection

/** Classifies pattern semantics without playback-only Beat and transition transforms. */
export const describePatternSelectionRelationships = (selection: MatrixPatternSelection) => {
  try {
    const {
      beat: _beat,
      transition: _transition,
      transitionBeats: _transitionBeats,
      transitionQuad: _transitionQuad,
      transitionSecond: _transitionSecond,
      propRotationOffsets: _propRotationOffsets,
      ...semanticSelection
    } = selection
    const animation =
      'quarters' in semanticSelection
        ? createDefaultQtrAnimation(semanticSelection)
        : createDefaultVtgAnimation(semanticSelection)
    if (!animation) throw new Error(`Missing pattern animation for ${selection.reference}`)

    return describePatternRelationships(
      animation,
      semanticSelection.orientation === 90 || semanticSelection.orientation === -90
        ? 'source'
        : 'destination',
    )
  } catch (error) {
    return createPatternRelationshipError(error, { selection })
  }
}
