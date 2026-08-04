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
} from '@/features/vtg/data/vtgPlayerSettings'

export const buildEightStepPattern = (
  selection: EightStepPatternSelection,
): EightStepReadableAnimation | undefined => {
  const definition = getEightStepPatternDefinition(selection.reference)
  if (!definition) return undefined
  const sourceProps = selection.reversePlane
    ? createFlippedEightStepProps(definition)
    : definition.props

  const transformedProps = sourceProps.map((prop) => ({
    ...prop,
    anim: prop.anim.map((frame, frameIndex) => ({
      ...frame,
      ...(frameIndex === 0 && selection.scale !== undefined
        ? { scale: toVtgInternalScale(selection.scale) }
        : undefined),
    })),
  }))

  return {
    ...vtgPlayerSettings,
    ...(selection.bpm !== undefined ? { bpm: clampVtgBpm(selection.bpm) } : undefined),
    ...(selection.scale !== undefined
      ? { distance: getVtgDistanceForScale(selection.scale) }
      : undefined),
    props: selection.swapProps ? transformedProps.reverse() : transformedProps,
  }
}
