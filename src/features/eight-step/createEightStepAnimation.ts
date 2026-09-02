import { toConceptPreviewAnimation } from '@/features/concepts/data/toConceptPreviewAnimation'
import { buildEightStepPattern } from '@/features/eight-step/data/eightStepPatternCatalog'
import type {
  EightStepPatternSelection,
  EightStepReadableAnimation,
} from '@/features/eight-step/types'
import { vtgPlayerSettings, vtgPropSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { decodeReadable, encodeReadable } from '@/services/animation/AnimReadableFunc'
import type { RootDataFinal, RootReadable } from '@/types/AnimTypes'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'
import { applyPatternPropVisibility } from '@/features/concepts/patternPropVisibility'
import { applyPatternPropSpacing } from '@/features/concepts/patternPropSpacing'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'
import { applyPatternPropColors } from '@/features/concepts/patternPropColors'
import { applyVtgPropRotationOffsets } from '@/features/vtg/createVtgAnimation'

const addPropDefaults = (pattern: EightStepReadableAnimation): EightStepReadableAnimation => ({
  ...pattern,
  props: pattern.props.map((prop, index) => ({
    ...vtgPropSettings[index],
    ...prop,
  })),
})

const mergeWithCurrentAnimation = (
  current: RootDataFinal,
  pattern: EightStepReadableAnimation,
): RootReadable => ({
  ...encodeReadable(current),
  ...pattern,
  props: pattern.props,
})

const eightStepStandaloneBase = rootFinal(
  decodeReadable({
    ...vtgPlayerSettings,
    smooth: true,
    props: [],
  }),
)

export const createEightStepAnimation = (
  current: RootDataFinal,
  selection: EightStepPatternSelection,
): RootDataFinal | undefined => {
  const selectedPattern = buildEightStepPattern(selection)
  if (!selectedPattern) return undefined

  const patternWithDefaults = addPropDefaults({
    ...selectedPattern,
    ...(selection.thick === undefined ? {} : { thick: selection.thick }),
    paths: selection.paths ?? vtgPlayerSettings.paths,
    hands: selection.hands ?? vtgPlayerSettings.hands,
    arms: selection.arms ?? vtgPlayerSettings.arms,
  })
  const pattern = {
    ...patternWithDefaults,
    props: applyPatternPropVisibility(
      applyPatternPropSpacing(patternWithDefaults.props, selection),
      selection,
    ),
  }
  const decoded = decodeReadable(mergeWithCurrentAnimation(current, pattern))

  const animation = {
    ...rootFinal(decoded),
    ...(selection.prop === undefined ? undefined : { prop: selection.prop }),
    camera: [createDefaultCameraFrame(pattern.distance ?? vtgPlayerSettings.distance)],
    speed: current.speed,
    type: pattern.type ?? current.type,
    turns: pattern.turns ?? current.turns,
    depth: pattern.depth ?? current.depth,
  }

  // Eight Step definitions name the first relationship first, but performers expect that
  // relationship on prop 2. Invert the shared Swap transform here so the expected assignment is
  // the concept default while the application-wide Swap control keeps its normal meaning.
  const transformed = applyPatternFinalTransforms(animation, {
    ...selection,
    swapProps: !selection.swapProps,
  })
  return applyPatternPropColors(
    applyVtgPropRotationOffsets(transformed, selection.propRotationOffsets),
    selection,
  )
}

export const createDefaultEightStepAnimation = (
  selection: EightStepPatternSelection,
): RootDataFinal | undefined => createEightStepAnimation(eightStepStandaloneBase, selection)

export const createEightStepPreviewAnimation = (
  selection: EightStepPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultEightStepAnimation(selection)
  return animation ? toConceptPreviewAnimation(animation) : undefined
}
