import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimData, AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'

export const doublePlaybackMultiplier = 2
const transportedContinuationAngle = 0

type InheritedFrameValues = Pick<
  AnimDataCompiled,
  'turns' | 'beats' | 'scale' | 'depth' | 'type' | 'adjust' | 'arc'
>

const interpolate = (start: number, end: number, progress: number) =>
  start + (end - start) * progress

const subdivideFrame = (
  start: AnimDataCompiled,
  target: AnimDataCompiled,
  step: number,
  subdivisionCount: number,
  inherited: InheritedFrameValues,
): AnimData => {
  const progress = step / subdivisionCount
  const desired = {
    turns: target.turns / subdivisionCount,
    beats: step === subdivisionCount ? target.beats : start.beats,
    scale: interpolate(start.scale, target.scale, progress),
    depth: interpolate(start.depth, target.depth, progress),
    type: target.type,
    adjust: interpolate(start.adjust, target.adjust, progress),
    arc: target.arc / subdivisionCount,
    plane: step === 1 ? target.plane : transportedContinuationAngle,
    axis: step === 1 ? target.axis : transportedContinuationAngle,
  }
  const frame: AnimData = {}

  if (desired.turns !== inherited.turns) frame.turns = desired.turns
  if (desired.beats !== inherited.beats) frame.beats = desired.beats
  if (desired.scale !== inherited.scale) frame.scale = desired.scale
  if (desired.depth !== inherited.depth) frame.depth = desired.depth
  if (desired.type !== inherited.type) frame.type = desired.type
  if (desired.adjust !== inherited.adjust) frame.adjust = desired.adjust
  if (desired.arc !== inherited.arc) frame.arc = desired.arc
  if (desired.plane !== transportedContinuationAngle) frame.plane = desired.plane
  if (desired.axis !== desired.plane) frame.axis = desired.axis

  inherited.turns = desired.turns
  inherited.beats = desired.beats
  inherited.scale = desired.scale
  inherited.depth = desired.depth
  inherited.type = desired.type
  inherited.adjust = desired.adjust
  inherited.arc = desired.arc

  return frame
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
  const inherited: InheritedFrameValues = {
    turns: firstCompiledFrame.turns,
    beats: firstCompiledFrame.beats,
    scale: firstCompiledFrame.scale,
    depth: firstCompiledFrame.depth,
    type: firstCompiledFrame.type,
    adjust: firstCompiledFrame.adjust,
    arc: firstCompiledFrame.arc,
  }

  for (let frameIndex = 1; frameIndex < compiled.length; frameIndex += 1) {
    const start = compiled[frameIndex - 1]
    const target = compiled[frameIndex]
    if (!start || !target) return undefined

    for (let step = 1; step <= subdivisionCount; step += 1) {
      subdivided.push(subdivideFrame(start, target, step, subdivisionCount, inherited))
    }
  }

  return subdivided
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
    props.push({ ...prop, anim })
  }

  return {
    ...animation,
    bpm: animation.bpm * subdivisionCount,
    props,
  }
}

export const doubleAnimationPlayback = (animation: RootDataFinal): RootDataFinal | undefined =>
  subdivideAnimationPlayback(animation, doublePlaybackMultiplier)
