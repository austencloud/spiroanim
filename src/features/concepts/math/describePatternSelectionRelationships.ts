import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'
import { createCompiledVtgPatternSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import {
  createPatternRelationshipError,
  describePatternRelationships,
} from '@/features/concepts/math/describePatternRelationships'
import type { RootDataFinal } from '@/types/AnimTypes'

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
    const normalizedSelection = {
      ...semanticSelection,
      isAnti: semanticSelection.isAnti ?? false,
      swapProps: semanticSelection.swapProps ?? false,
      reversePlane: semanticSelection.reversePlane ?? false,
    }
    const relativePropRotation = selection.propRotationOffsets
      ? Math.abs(selection.propRotationOffsets[0] - selection.propRotationOffsets[1]) % 360
      : 0
    const relationshipPropRotationOffsets =
      relativePropRotation % 90 === 0 ? selection.propRotationOffsets : undefined
    const animation =
      'quarters' in normalizedSelection
        ? createDefaultQtrAnimation({
            ...normalizedSelection,
            ...(relationshipPropRotationOffsets
              ? { propRotationOffsets: relationshipPropRotationOffsets }
              : undefined),
          })
        : createDefaultVtgAnimation({
            ...normalizedSelection,
            ...(relationshipPropRotationOffsets
              ? { propRotationOffsets: relationshipPropRotationOffsets }
              : undefined),
          })
    if (!animation) throw new Error(`Missing pattern animation for ${selection.reference}`)

    const checkpoint =
      normalizedSelection.orientation === 90 || normalizedSelection.orientation === -90
        ? 'source'
        : 'destination'
    return describePatternRelationships(animation, checkpoint)
  } catch (error) {
    return createPatternRelationshipError(error, { selection })
  }
}

export const inferPatternRelationshipPropRotationOffsets = (
  animation: RootDataFinal,
  selection: MatrixPatternSelection,
): readonly [number, number] | undefined => {
  if (selection.propRotationOffsets) return selection.propRotationOffsets

  const actualAnimationSignature = createCompiledVtgPatternSignature(animation)
  for (const offset of [-90, 90, -180, 180] as const) {
    const propRotationOffsets = [offset, 0] as const
    const candidate =
      'quarters' in selection
        ? createDefaultQtrAnimation({ ...selection, propRotationOffsets })
        : createDefaultVtgAnimation({ ...selection, propRotationOffsets })
    if (candidate && createCompiledVtgPatternSignature(candidate) === actualAnimationSignature) {
      return propRotationOffsets
    }
  }

  const actualTiming = describePatternRelationships(animation).props?.timing
  const canonicalTiming = describePatternSelectionRelationships(selection).props?.timing
  if (!actualTiming || !canonicalTiming || actualTiming === canonicalTiming) return undefined

  for (const offset of [-90, 90, -180, 180] as const) {
    const propRotationOffsets = [offset, 0] as const
    const transformedTiming = describePatternSelectionRelationships({
      ...selection,
      propRotationOffsets,
    }).props?.timing
    if (transformedTiming === actualTiming) return propRotationOffsets
  }
  return undefined
}

export const inferPatternRelationshipOrientation = (
  animation: RootDataFinal,
  selection: MatrixPatternSelection,
): number | undefined => {
  if (selection.orientation !== undefined) return selection.orientation
  if (!('quarters' in selection)) return undefined
  const actualHands = describePatternRelationships(animation).hands
  const canonicalHands = describePatternSelectionRelationships(selection).hands
  if (!actualHands || !canonicalHands || actualHands.timing === canonicalHands.timing)
    return undefined

  for (const orientation of [-45, 45, -90, 90, 180] as const) {
    const candidateHands = describePatternSelectionRelationships({
      ...selection,
      orientation,
    }).hands
    if (
      candidateHands?.timing === actualHands.timing &&
      candidateHands.direction === actualHands.direction
    ) {
      return orientation
    }
  }
  return undefined
}
