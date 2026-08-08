import {
  createFlippedEightStepProps,
  getEightStepPatternDefinition,
} from '@/features/eight-step/data/eightStepPatternDefinitions'
import type {
  EightStepPatternSelection,
  EightStepReadableAnimation,
} from '@/features/eight-step/types'
import {
  clampVtgBpm,
  getVtgDistanceForScale,
  toVtgInternalScale,
  vtgPlayerSettings,
  vtgScaleControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { deriveBoxInitialPlacement } from '@/math/animation/SpatialRelationshipFunc'

export const buildEightStepPattern = (
  selection: EightStepPatternSelection,
): EightStepReadableAnimation | undefined => {
  const definition = getEightStepPatternDefinition(selection.reference)
  if (!definition) return undefined
  const sourceProps = selection.reversePlane
    ? createFlippedEightStepProps(definition)
    : definition.props

  const transformedProps = sourceProps.map((prop) => {
    const initialArc = prop.anim[0]?.arc ?? 0
    const initialPlane = prop.anim[0]?.plane ?? 0
    const boxPlacement = deriveBoxInitialPlacement({ arc: initialArc, plane: initialPlane })
    const firstContinuationArc = prop.anim[1]?.arc ?? initialArc

    return {
      ...prop,
      anim: prop.anim.map((frame, frameIndex) => ({
        ...frame,
        ...(selection.shape === 'box' && frameIndex === 0 ? boxPlacement : undefined),
        ...(selection.shape === 'box' && frameIndex === 1
          ? { arc: firstContinuationArc }
          : undefined),
        ...(frameIndex === 0 && selection.scale !== undefined
          ? { scale: toVtgInternalScale(selection.scale) }
          : undefined),
      })),
    }
  })

  return {
    ...vtgPlayerSettings,
    ...(selection.bpm !== undefined ? { bpm: clampVtgBpm(selection.bpm) } : undefined),
    distance: getVtgDistanceForScale(selection.scale ?? vtgScaleControl.default),
    props: selection.swapProps ? transformedProps.reverse() : transformedProps,
  }
}
