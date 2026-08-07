// src/math/animation/PlayerFunc.ts

import { TTYPE } from '@/domain/animation/AnimStruct'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'

import type { RootData, RootDataFinal, RootDataCompiled } from '@/types/AnimTypes'

// TODO: This should probably be moved somewhere else, or the definitions
// Default / Inheritence values that user doesn't set
export const rootFinal = (root: RootData): RootDataFinal => {
  const { camera: authoredCamera, distance: legacyDistance, props, ...settings } = root

  return {
    speed: 1,
    type: TTYPE.SPHE,
    //flip: false,
    turns: 0,
    depth: 0,
    ...settings,
    // V1 URLs predate Arms, so normalize their missing value to the requested root default.
    arms: root.arms ?? false,
    // Travel was added with QS v4, so older URLs need the same explicit Root default.
    travel: root.travel ?? false,
    camera:
      authoredCamera && authoredCamera.length > 0
        ? authoredCamera.map((frame) => ({
            ...frame,
            orbit: { ...frame.orbit },
            center: { ...frame.center },
          }))
        : [createDefaultCameraFrame(legacyDistance)],
    props: props.map((prop) => ({ ...prop, motion: prop.motion ?? [] })),
  }
}

export const msToBeat = (ms: number, bpm: number): number => {
  return Math.round(ms / (60000 / bpm)) // Round solved BPM issues on timeline
}

// Millisecond start/end of animations for each prop
export const FRAMESTARTS = (frames: readonly { beats?: number }[], bpm: number): number[] => {
  const ms = Math.round(60000 / bpm)
  const times = Array.from({ length: frames.length }, () => 0)
  let currentStart = 0

  frames.forEach((frame, index) => {
    times[index] = currentStart
    currentStart += Math.floor((frame.beats ?? 1) * ms)
  })

  return times
}

export const PROPTIMES = (propData: RootDataCompiled): number[][] => {
  const propTimes: number[][] = Array.from({ length: propData.props.length }, () => [])

  propData.props.forEach((prop, i) => {
    propTimes[i] = FRAMESTARTS(prop.anim, propData.bpm)
  })

  return propTimes
}

export const MOTIONTIMES = (propData: RootDataCompiled): number[][] =>
  propData.props.map((prop) => FRAMESTARTS(prop.motion, propData.bpm))

export const CAMERATIMES = (data: RootDataCompiled): number[] =>
  FRAMESTARTS(
    data.camera.map((frame) => frame.orbit),
    data.bpm,
  )

// Unique merger of PROPTIMES
export const UNQTIMES = (propTimes: number[][] | RootDataCompiled): number[] => {
  // Check if propTimes is of type RootDataFinal by verifying the existence of `props`
  if ('props' in propTimes)
    // Convert RootDataFinal to number[][] using PROPTIMES
    propTimes = PROPTIMES(propTimes)

  // Flatten, deduplicate, and sort the intervals
  const flattenedArray = propTimes.flat(),
    uniqueArray = [...new Set(flattenedArray)]

  return uniqueArray.sort((a, b) => a - b)
}
