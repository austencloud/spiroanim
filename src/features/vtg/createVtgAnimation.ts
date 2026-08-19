import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import { toConceptPreviewAnimation } from '@/features/concepts/data/toConceptPreviewAnimation'
import { vtgPlayerSettings, vtgPropSettings } from '@/features/vtg/data/vtgPlayerSettings'
import type { VtgPatternSelection, VtgReadableAnimation } from '@/features/vtg/types'
import { vtgDefaultBeat, vtgDefaultTransitionBeats } from '@/features/vtg/types'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { decodeReadable, encodeReadable } from '@/services/animation/AnimReadableFunc'
import type { RootDataFinal, RootReadable } from '@/types/AnimTypes'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'
import { shiftVtgStartingBeat } from '@/features/vtg/math/shiftVtgStartingBeat'
import {
  applyVtgInitialTurnsPlayback,
  withVtgInitialTurnsOffsetBeat,
} from '@/features/vtg/math/applyVtgInitialTurnsOffset'
import { alternatePatternPlayback } from '@/math/animation/alternatePatternPlayback'
import { applyPatternPropVisibility } from '@/features/concepts/patternPropVisibility'
import { applyPatternPropSpacing } from '@/features/concepts/patternPropSpacing'
import {
  applyPatternFinalTransforms,
  applyPatternInitialArcRotation,
} from '@/features/concepts/applyPatternFinalTransforms'
import { applyPatternPropColors } from '@/features/concepts/patternPropColors'

const vtgFrameCount = 9

const applyPropRotationOffsets = (
  animation: RootDataFinal,
  offsets: VtgPatternSelection['propRotationOffsets'],
): RootDataFinal =>
  offsets === undefined || offsets.every((offset) => offset === 0)
    ? animation
    : {
        ...animation,
        props: animation.props.map((prop, index) => {
          const firstFrame = prop.anim[0]
          const offset = offsets[index]
          return !firstFrame || offset === undefined || offset === 0
            ? prop
            : {
                ...prop,
                anim: [
                  { ...firstFrame, turns: (firstFrame.turns ?? 0) + offset },
                  ...prop.anim.slice(1),
                ],
              }
        }),
      }

const addDefaultFrames = (pattern: VtgReadableAnimation): VtgReadableAnimation => ({
  ...pattern,
  props: pattern.props.map((prop, index) => {
    const defaults = vtgPropSettings[index]

    return {
      ...defaults,
      ...prop,
      anim: [
        ...prop.anim,
        ...Array.from({ length: Math.max(0, vtgFrameCount - prop.anim.length) }, () => ({})),
      ],
    }
  }),
})

const mergeWithCurrentAnimation = (
  current: RootDataFinal,
  pattern: VtgReadableAnimation,
): RootReadable => ({
  ...encodeReadable(current),
  ...pattern,
  props: pattern.props,
})

const vtgStandaloneBase = rootFinal(
  decodeReadable({
    ...vtgPlayerSettings,
    smooth: true,
    props: [],
  }),
)

export const applyVtgPlaybackControls = (
  animation: RootDataFinal,
  selection: Pick<
    VtgPatternSelection,
    | 'speedRatio'
    | 'beat'
    | 'transition'
    | 'transitionBeats'
    | 'transitionAfterBeat'
    | 'transitionQuad'
    | 'transitionSecond'
    | 'swapProps'
  >,
): RootDataFinal | undefined => {
  const shifted = shiftVtgStartingBeat(animation, selection.beat ?? vtgDefaultBeat)
  const transition = selection.transition === true
  if (!shifted || !transition) return shifted

  const selectedPropIndex = selection.transitionQuad && selection.transitionSecond ? 1 : 0
  const playbackPropIndex = selection.swapProps
    ? selectedPropIndex === 0
      ? 1
      : 0
    : selectedPropIndex
  return alternatePatternPlayback(
    shifted,
    selection.transitionBeats ?? vtgDefaultTransitionBeats,
    playbackPropIndex,
    selection.transitionQuad,
    selection.transitionAfterBeat,
  )
}

/**
 * Builds fresh player data for a VTG selection. Undefined means that the
 * selected cell has no pattern for that speed ratio yet.
 */
export const createVtgAnimation = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const selectedPattern = buildVtgPattern(selection)
  if (!selectedPattern) return undefined

  const patternWithDefaults = addDefaultFrames({
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
    camera: [createDefaultCameraFrame(pattern.distance ?? vtgPlayerSettings.distance)],
    speed: current.speed,
    type: pattern.type ?? current.type,
    turns: pattern.turns ?? current.turns,
    depth: pattern.depth ?? current.depth,
  }

  const oriented = applyPatternInitialArcRotation(animation, selection.orientation)
  const completed = applyVtgPlaybackControls(oriented, withVtgInitialTurnsOffsetBeat(selection))
  if (!completed || (selection.transition && selection.initialTurnsOffset !== undefined)) {
    return undefined
  }

  const transformed = applyPatternFinalTransforms(completed, selection)
  const aligned = applyPropRotationOffsets(transformed, selection.propRotationOffsets)
  const playback = applyVtgInitialTurnsPlayback(aligned, selection)
  return playback ? applyPatternPropColors(playback, selection) : undefined
}

/**
 * Builds VTG data without inheriting settings from the active player.
 */
export const createDefaultVtgAnimation = (
  selection: VtgPatternSelection,
): RootDataFinal | undefined => createVtgAnimation(vtgStandaloneBase, selection)

/**
 * Builds VTG data without inheriting settings from the active player.
 */
export const toVtgPreviewAnimation = toConceptPreviewAnimation

export const createVtgPreviewAnimation = (
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const animation = createDefaultVtgAnimation(selection)
  return animation ? toVtgPreviewAnimation(animation) : undefined
}
