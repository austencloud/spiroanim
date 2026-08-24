import { rootCompile } from '@/math/animation/AnimFunc'
import { compactAnimationFrames } from '@/math/animation/compressFrames'
import { resolveMotionFrames } from '@/math/animation/frameSemantics'
import type {
  AnimData,
  AnimDataCompiled,
  CameraData,
  MotionData,
  RootDataFinal,
} from '@/types/AnimTypes'

export const doublePlaybackMultiplier = 2
const transportedContinuationAngle = 0

const interpolate = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

const scaleMotionTrackBeats = (frames: readonly MotionData[], multiplier: number): MotionData[] => {
  if (frames.length <= 1) return frames.map((frame) => ({ ...frame }))

  const resolved = resolveMotionFrames(frames)
  return frames.map((frame, index) => ({
    ...frame,
    beats: resolved[index]!.beats * multiplier,
  }))
}

const scaleCameraTrackBeats = (frames: readonly CameraData[], multiplier: number): CameraData[] => {
  if (frames.length <= 1) {
    return frames.map((frame) => ({
      ...frame,
      ...(frame.orbit === undefined ? {} : { orbit: { ...frame.orbit } }),
      ...(frame.center === undefined ? {} : { center: { ...frame.center } }),
    }))
  }

  const resolvedOrbit = resolveMotionFrames(frames.map((frame) => frame.orbit ?? {}))
  return frames.map((frame, index) => ({
    ...frame,
    orbit: {
      ...frame.orbit,
      beats: resolvedOrbit[index]!.beats * multiplier,
    },
  }))
}

const subdivideFrame = (
  start: AnimDataCompiled,
  target: AnimDataCompiled,
  step: number,
  subdivisionCount: number,
): AnimData => {
  const progress = step / subdivisionCount
  return {
    turns: target.turns / subdivisionCount,
    twist: target.twist / subdivisionCount,
    beats: step === subdivisionCount ? target.beats : start.beats,
    scale: interpolate(start.scale, target.scale, progress),
    depth: interpolate(start.depth, target.depth, progress),
    type: target.type,
    adjust: interpolate(start.adjust, target.adjust, progress),
    arc: target.arc / subdivisionCount,
    plane: step === 1 ? target.plane : transportedContinuationAngle,
    axis: step === 1 ? target.axis : transportedContinuationAngle,
  }
}

const subdivideFrames = (
  frames: readonly AnimData[],
  compiled: readonly AnimDataCompiled[],
  subdivisionCount: number,
): AnimData[] | undefined => {
  const firstFrame = frames[0]
  const firstCompiledFrame = compiled[0]
  if (
    firstFrame === undefined ||
    firstCompiledFrame === undefined ||
    frames.length !== compiled.length
  ) {
    return undefined
  }

  const subdivided: AnimData[] = [{ ...firstFrame }]

  for (let frameIndex = 1; frameIndex < compiled.length; frameIndex += 1) {
    const start = compiled[frameIndex - 1]
    const target = compiled[frameIndex]
    if (!start || !target) return undefined

    for (let step = 1; step <= subdivisionCount; step += 1) {
      subdivided.push(subdivideFrame(start, target, step, subdivisionCount))
    }
  }

  return compactAnimationFrames(subdivided, {
    // The starting frame is an authored pattern boundary inspected by VTG matching callers.
    preserve: (frameIndex) => frameIndex === 0,
  })
}

/**
 * Raises playback rate while subdividing every authored interval so duration,
 * endpoints, and the visible path remain unchanged.
 */
export const subdivideAnimationPlayback = (
  animation: RootDataFinal,
  subdivisionCount: number,
): RootDataFinal | undefined => {
  if (!Number.isInteger(subdivisionCount) || subdivisionCount < doublePlaybackMultiplier) {
    return undefined
  }

  const compiled = rootCompile(animation)
  const props = []

  for (const [propIndex, prop] of animation.props.entries()) {
    const compiledProp = compiled.props[propIndex]
    if (!compiledProp) return undefined

    const anim = subdivideFrames(prop.anim, compiledProp.anim, subdivisionCount)
    if (!anim) return undefined
    props.push({
      ...prop,
      anim,
      motion: scaleMotionTrackBeats(prop.motion, subdivisionCount),
    })
  }

  return {
    ...animation,
    bpm: animation.bpm * subdivisionCount,
    camera: scaleCameraTrackBeats(animation.camera, subdivisionCount),
    props,
  }
}

export const doubleAnimationPlayback = (animation: RootDataFinal): RootDataFinal | undefined =>
  subdivideAnimationPlayback(animation, doublePlaybackMultiplier)

/**
 * Lowers playback rate while combining equal groups of authored intervals. This is the inverse of
 * subdivision for uniformly authored motion and retains each group's final visual state.
 */
export const consolidateAnimationPlayback = (
  animation: RootDataFinal,
  consolidationCount: number,
): RootDataFinal | undefined => {
  if (!Number.isInteger(consolidationCount) || consolidationCount < doublePlaybackMultiplier) {
    return undefined
  }

  const compiled = rootCompile(animation)
  const props = animation.props.map((prop, propIndex) => {
    const compiledProp = compiled.props[propIndex]
    const firstFrame = prop.anim[0]
    if (
      !compiledProp ||
      !firstFrame ||
      prop.anim.length !== compiledProp.anim.length ||
      (prop.anim.length - 1) % consolidationCount !== 0
    ) {
      return undefined
    }

    const anim: AnimData[] = [{ ...firstFrame }]
    for (
      let startIndex = 1;
      startIndex < compiledProp.anim.length;
      startIndex += consolidationCount
    ) {
      const first = compiledProp.anim[startIndex]
      const last = compiledProp.anim[startIndex + consolidationCount - 1]
      if (!first || !last) return undefined

      anim.push({
        turns: Array.from(
          { length: consolidationCount },
          (_, offset) => compiledProp.anim[startIndex + offset]?.turns,
        ).reduce<number>((sum, turns) => sum + (turns ?? 0), 0),
        twist: Array.from(
          { length: consolidationCount },
          (_, offset) => compiledProp.anim[startIndex + offset]?.twist,
        ).reduce<number>((sum, twist) => sum + (twist ?? 0), 0),
        beats: last.beats,
        scale: last.scale,
        depth: last.depth,
        type: last.type,
        adjust: last.adjust,
        arc: Array.from(
          { length: consolidationCount },
          (_, offset) => compiledProp.anim[startIndex + offset]?.arc,
        ).reduce<number>((sum, arc) => sum + (arc ?? 0), 0),
        plane: first.plane,
        axis: first.axis,
      })
    }
    return {
      ...prop,
      anim: compactAnimationFrames(anim, {
        // Consolidation retains the source's authored starting boundary.
        preserve: (frameIndex) => frameIndex === 0,
      }),
      motion: scaleMotionTrackBeats(prop.motion, 1 / consolidationCount),
    }
  })
  if (props.some((prop) => prop === undefined)) return undefined

  return {
    ...animation,
    bpm: animation.bpm / consolidationCount,
    camera: scaleCameraTrackBeats(animation.camera, 1 / consolidationCount),
    props: props.map((prop) => prop!),
  }
}
