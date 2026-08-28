import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import type { QtrPatternSelection } from '@/features/vtg/types'
import { getVtgPropSpeedRatios, parseVtgIndividualSpeedRatio } from '@/features/vtg/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'
import { createCompiledVtgPatternSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import {
  createPatternRelationships,
  createPatternRelationshipError,
  describePatternRelationships,
} from '@/features/concepts/math/describePatternRelationships'
import type { RootDataFinal } from '@/types/AnimTypes'

type MatrixPatternSelection = VtgPatternSelection | QtrPatternSelection

/** Classifies pattern semantics at the selected Beat without transition-only transforms. */
export const describePatternSelectionRelationships = (selection: MatrixPatternSelection) => {
  try {
    const {
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
    return createPatternRelationshipError(error)
  }
}

/**
 * Whether a prop timing code remains valid after every half-Beat starting shift.
 *
 * Each frame advances a prop by 45 degrees times its denominator/numerator rate. Together and
 * Split require the relative advance to close modulo 360 degrees. Quarter treats both 90 and 270
 * degrees as the same code, so it closes modulo 180 degrees instead.
 */
export const isPatternPropTimingBeatInvariant = (
  speedRatio: VtgPatternSelection['speedRatio'],
  timing: NonNullable<ReturnType<typeof describePatternRelationships>['props']>['timing'],
): boolean => {
  const [firstRatio, secondRatio] = getVtgPropSpeedRatios(speedRatio)
  const first = parseVtgIndividualSpeedRatio(firstRatio)
  const second = parseVtgIndividualSpeedRatio(secondRatio)
  if (!first || !second) return false

  const relativeRateNumerator =
    first.denominator * second.numerator - second.denominator * first.numerator
  const phaseModulus = timing === 'Q' ? 4 : 8
  return relativeRateNumerator % (phaseModulus * first.numerator * second.numerator) === 0
}

/**
 * Produces matrix/Elemental labels that remain truthful for the complete repeating Beat cycle.
 * The selected-Beat classifier remains separate so matching can still inspect the exact animation.
 */
export const describePatternSelectionRelationshipsAcrossBeats = (
  selection: MatrixPatternSelection,
) => {
  const current = describePatternSelectionRelationships(selection)
  const hands = current.handsIndeterminate ? undefined : current.hands
  const props =
    current.props &&
    !current.propsIndeterminate &&
    isPatternPropTimingBeatInvariant(selection.speedRatio, current.props.timing)
      ? current.props
      : undefined

  return createPatternRelationships(hands, props)
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
