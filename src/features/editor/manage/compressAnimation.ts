import { MOTION_SHAPE, PROPCP, TTYPE } from '@/domain/animation/AnimStruct'
import { DEFAULT_MOTION_AMOUNT } from '@/math/animation/MotionFunc'
import type {
  AnimData,
  MotionData,
  MotionShapeInd,
  PropDataFinal,
  RootDataFinal,
} from '@/types/AnimTypes'

const animationInheritedDefaults = {
  beats: 1,
  turns: 0,
  scale: 10,
  depth: 0,
  type: TTYPE.SPHE,
  adjust: 0,
  arc: 0,
} as const

type AnimationInheritedKey = keyof typeof animationInheritedDefaults

const compressAnimationFrames = (frames: AnimData[]): number => {
  let removed = 0
  const inherited: Record<AnimationInheritedKey, number> = { ...animationInheritedDefaults }

  for (const frame of frames) {
    for (const key of Object.keys(animationInheritedDefaults) as AnimationInheritedKey[]) {
      const value = frame[key]
      if (value === undefined) continue
      if (value === inherited[key]) {
        delete frame[key]
        removed++
      } else inherited[key] = value
    }

    if (frame.plane === 0) {
      delete frame.plane
      removed++
    }
    const effectivePlane = frame.plane ?? 0
    if (frame.axis === effectivePlane) {
      delete frame.axis
      removed++
    }
  }

  return removed
}

const compressMotionFrames = (frames: MotionData[]): number => {
  let removed = 0
  let inheritedBeats = 1
  let inheritedShape: MotionShapeInd = MOTION_SHAPE.LINE
  let sourceAmount = DEFAULT_MOTION_AMOUNT
  let compressedAmount = DEFAULT_MOTION_AMOUNT

  for (const frame of frames) {
    const effectiveBeats = frame.beats ?? inheritedBeats
    const effectiveShape: MotionShapeInd = frame.shape ?? inheritedShape
    const effectiveAmount = frame.amount ?? sourceAmount

    if (frame.beats !== undefined) {
      if (frame.beats === inheritedBeats) {
        delete frame.beats
        removed++
      } else inheritedBeats = frame.beats
    }
    if (frame.shape !== undefined) {
      if (frame.shape === inheritedShape) {
        delete frame.shape
        removed++
      } else inheritedShape = frame.shape
    }

    for (const key of ['arc', 'plane', 'distance'] as const) {
      if (frame[key] === 0) {
        delete frame[key]
        removed++
      }
    }

    if (effectiveShape === MOTION_SHAPE.LINE) {
      if (frame.axis !== undefined) {
        delete frame.axis
        removed++
      }
      if (frame.amount !== undefined) {
        delete frame.amount
        removed++
      }
    } else {
      if (frame.axis === 0) {
        delete frame.axis
        removed++
      }
      if (effectiveAmount === compressedAmount) {
        if (frame.amount !== undefined) {
          delete frame.amount
          removed++
        }
      } else {
        frame.amount = effectiveAmount
        compressedAmount = effectiveAmount
      }
    }

    inheritedBeats = effectiveBeats
    inheritedShape = effectiveShape
    sourceAmount = effectiveAmount
  }

  return removed
}

const compressProp = (root: RootDataFinal, prop: PropDataFinal): number => {
  let removed = 0
  for (const key of PROPCP) {
    if (prop[key] !== undefined && prop[key] === root[key]) {
      delete prop[key]
      removed++
    }
  }
  return removed + compressAnimationFrames(prop.anim) + compressMotionFrames(prop.motion)
}

/** Removes authored values that do not affect the animation's current result. */
export const compressAnimation = (root: RootDataFinal): number =>
  root.props.reduce((removed, prop) => removed + compressProp(root, prop), 0)
