import {
  clampVtgBpm,
  getVtgDistanceForScale,
  toVtgInternalScale,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import {
  applyPatternPropColors,
  type PatternPropColor,
} from '@/features/concepts/patternPropColors'
import { getPatternPropMoves } from '@/features/concepts/patternPropSpacing'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'
import type { MotionData, PropDataFinal, PropInd, RootDataFinal } from '@/types/AnimTypes'

export interface VtgBuilderDisplaySettings {
  bpm: number
  scale: number
  thick: number
  spacing: number
  paths: boolean
  hands: boolean
  arms: boolean
  leftPropVisible: boolean
  rightPropVisible: boolean
  propColors: readonly [PatternPropColor, PatternPropColor]
  prop: PropInd
}

interface VtgBuilderDisplayOptions {
  thumbnail?: boolean
}

const createSpacingMotion = (move: number): MotionData[] =>
  move === 0
    ? []
    : [{ precision: true, arc: 90, plane: move < 0 ? 180 : 0, distance: Math.abs(move) }]

const withFirstFrameScale = (prop: PropDataFinal, scale: number): PropDataFinal => {
  const firstFrame = prop.anim[0]
  if (!firstFrame) return prop

  return {
    ...prop,
    anim: [{ ...firstFrame, scale }, ...prop.anim.slice(1)],
  }
}

/** Applies Builder display controls without changing the authored animation. */
export const toVtgBuilderDisplayAnimation = (
  animation: RootDataFinal,
  settings: number | VtgBuilderDisplaySettings,
  options: VtgBuilderDisplayOptions = {},
): RootDataFinal => {
  const scale = typeof settings === 'number' ? settings : settings.scale
  const internalScale = toVtgInternalScale(scale)
  const scaled = {
    ...animation,
    camera: [createDefaultCameraFrame(getVtgDistanceForScale(scale))],
    props: animation.props.map((prop) => withFirstFrameScale(prop, internalScale)),
  }

  if (typeof settings === 'number') return scaled

  const thumbnail = options.thumbnail === true
  const moves = getPatternPropMoves(settings.spacing)
  const thick = thumbnail ? vtgThickControl.max : settings.thick
  const props = scaled.props.map((original, index) => {
    const { visible: _visible, ...prop } = original
    const visible = index === 0 ? settings.leftPropVisible : settings.rightPropVisible
    const displayed = {
      ...prop,
      paths: settings.paths,
      hands: settings.hands,
      arms: settings.arms,
      thick,
      motion: createSpacingMotion(moves[index] ?? 0),
    }

    return !thumbnail && !visible
      ? { ...displayed, paths: false, hands: false, arms: false, visible: false }
      : displayed
  })

  return applyPatternPropColors(
    {
      ...scaled,
      bpm: clampVtgBpm(settings.bpm) * 2,
      prop: settings.prop,
      paths: settings.paths,
      hands: settings.hands,
      arms: settings.arms,
      thick,
      props,
    },
    { propColors: settings.propColors },
  )
}
