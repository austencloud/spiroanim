import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import type {
  QtrPatternSelection,
  VtgPatternOrientation,
  VtgPatternSelection,
} from '@/features/vtg/types'
import { getVtgPatternOrientations, vtgBeats } from '@/features/vtg/types'

const getUniqueOrientationsForBeat = (
  selection: VtgPatternSelection | QtrPatternSelection,
  orientations: ReadonlySet<VtgPatternOrientation>,
): readonly VtgPatternOrientation[] => {
  const signatures = new Set<string>()
  const available: VtgPatternOrientation[] = []
  const preferences = { swapProps: false, reversePlane: false }

  for (const orientation of orientations) {
    const animation =
      'quarters' in selection
        ? createDefaultQtrAnimation({
            ...selection,
            orientation: orientation === 0 ? undefined : orientation,
          })
        : createDefaultVtgAnimation({
            ...selection,
            orientation: orientation === 0 ? undefined : orientation,
          })
    if (!animation) continue

    const signature = createVtgAnimationSignature(animation)
    if (!signature || signatures.has(signature)) continue
    signatures.add(signature)

    if (orientation === 0) {
      available.push(orientation)
      continue
    }

    const unrotatedMatch =
      findVtgPatternMatch(animation, preferences, 'unrotated') ??
      findQtrPatternMatch(
        animation,
        { ...preferences, quarters: 'quarters' in selection ? selection.quarters : 1 },
        'unrotated',
      )
    if (!unrotatedMatch) available.push(orientation)
  }

  return available
}

/**
 * Retains rotations that create a distinct animation which cannot already be represented by an
 * unrotated VTG or QTR selection. Rotation describes the pattern family rather than one starting
 * phase, so an orientation is retained only when it remains distinct across all eight starting
 * frames. Swap and 180 are reversible final transforms applied equally to the animation and the
 * catalog, so they cannot change whether an unrotated representation exists. The result therefore
 * cannot change when Beat, Swap, or 180 is toggled. Matcher indexes are separated by orientation,
 * so these checks initialize only the zero-degree index.
 */
export const getUniqueVtgPatternOrientations = (
  selection: VtgPatternSelection | QtrPatternSelection,
): readonly VtgPatternOrientation[] => {
  const {
    beat: _beat,
    swapProps: _swapProps,
    reversePlane: _reversePlane,
    ...baseSelection
  } = selection
  const available = new Set<VtgPatternOrientation>(getVtgPatternOrientations(selection.speedRatio))

  for (const beat of vtgBeats) {
    const availableForBeat = new Set<VtgPatternOrientation>(
      getUniqueOrientationsForBeat({ ...baseSelection, beat }, available),
    )

    for (const orientation of available) {
      if (!availableForBeat.has(orientation)) available.delete(orientation)
    }

    if (available.size === 1) break
  }

  return getVtgPatternOrientations(selection.speedRatio).filter((orientation) =>
    available.has(orientation),
  )
}
