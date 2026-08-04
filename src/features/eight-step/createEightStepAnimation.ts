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

  const pattern = addPropDefaults({
    ...selectedPattern,
    ...(selection.thick === undefined ? {} : { thick: selection.thick }),
    paths: selection.paths ?? vtgPlayerSettings.paths,
    hands: selection.hands ?? vtgPlayerSettings.hands,
    arms: selection.arms ?? vtgPlayerSettings.arms,
  })
  const decoded = decodeReadable(mergeWithCurrentAnimation(current, pattern))

  return {
    ...rootFinal(decoded),
    speed: pattern.speed ?? current.speed,
    type: pattern.type ?? current.type,
    turns: pattern.turns ?? current.turns,
    depth: pattern.depth ?? current.depth,
  }
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
