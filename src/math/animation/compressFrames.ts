import { MOTION_SHAPE } from '@/domain/animation/AnimStruct'
import { compileMotionTrack } from '@/math/animation/MotionFunc'
import {
  ANIMATION_INHERITED_KEYS,
  INITIAL_ANIMATION_FRAME,
  INITIAL_READABLE_ANIMATION_FRAME,
  MOTION_FRAME_KEYS,
  resolveAnimationFrames,
  resolveReadableAnimationFrames,
  type AnimationFrameKey,
  type MotionFrameKey,
  type ResolveMotionFramesOptions,
  type ResolvedAnimationFrame,
} from '@/math/animation/frameSemantics'
import type {
  AnimData,
  AnimReadable,
  MotionData,
  MotionDataCompiled,
  MotionPathDataCompiled,
  TypeStr,
} from '@/types/AnimTypes'

export interface CompressAnimationFramesOptions {
  preceding?: ResolvedAnimationFrame
  preserve?: (frameIndex: number, key: AnimationFrameKey) => boolean
}

export interface CompressReadableAnimationFramesOptions {
  preceding?: ResolvedAnimationFrame<TypeStr>
  preserve?: (frameIndex: number, key: AnimationFrameKey) => boolean
}

export interface CompressMotionFramesOptions extends ResolveMotionFramesOptions {
  preserve?: (frameIndex: number, key: MotionFrameKey) => boolean
}

const removeZeroMove = (frame: AnimData | AnimReadable): boolean => {
  if (frame.move === undefined || !frame.move.every((coordinate) => coordinate === 0)) return false
  delete frame.move
  return true
}

const compressResolvedAnimationFrames = <TFrame extends AnimData | AnimReadable>(
  frames: TFrame[],
  resolve: () => readonly ResolvedAnimationFrame<number | string>[],
  initial: ResolvedAnimationFrame<number | string>,
  preserve: ((frameIndex: number, key: AnimationFrameKey) => boolean) | undefined,
): number => {
  const expected = resolve()
  let removed = 0

  frames.forEach((frame, frameIndex) => {
    const resolved = expected[frameIndex]
    const previous = expected[frameIndex - 1] ?? initial
    if (!resolved) return

    for (const key of ANIMATION_INHERITED_KEYS) {
      if (
        frame[key] !== undefined &&
        preserve?.(frameIndex, key) !== true &&
        resolved[key] === previous[key]
      ) {
        delete frame[key]
        removed++
      }
    }

    if (
      frame.plane !== undefined &&
      preserve?.(frameIndex, 'plane') !== true &&
      resolved.plane === 0
    ) {
      delete frame.plane
      removed++
    }
    if (
      frame.axis !== undefined &&
      preserve?.(frameIndex, 'axis') !== true &&
      resolved.axis === resolved.plane
    ) {
      delete frame.axis
      removed++
    }
    if (
      frame.rotate !== undefined &&
      preserve?.(frameIndex, 'rotate') !== true &&
      resolved.rotate === 0
    ) {
      delete frame.rotate
      removed++
    }
    if (removeZeroMove(frame)) removed++
  })

  return removed
}

/** Mutates Animation frames to the smallest form with identical compiler-resolved values. */
export const compressAnimationFrames = (
  frames: AnimData[],
  options: CompressAnimationFramesOptions = {},
): number =>
  compressResolvedAnimationFrames(
    frames,
    () => resolveAnimationFrames(frames, options.preceding),
    options.preceding ?? INITIAL_ANIMATION_FRAME,
    options.preserve,
  )

export const compactAnimationFrames = (
  frames: readonly AnimData[],
  options: CompressAnimationFramesOptions = {},
): AnimData[] => {
  const compacted = frames.map((frame) => ({ ...frame }))
  compressAnimationFrames(compacted, options)
  return compacted
}

/** Readable pattern equivalent of `compressAnimationFrames`, using the same compiler rules. */
export const compactReadableAnimationFrames = (
  frames: readonly AnimReadable[],
  options: CompressReadableAnimationFramesOptions = {},
): AnimReadable[] => {
  const compacted = frames.map((frame) => ({ ...frame }))
  compressResolvedAnimationFrames(
    compacted,
    () => resolveReadableAnimationFrames(compacted, options.preceding),
    options.preceding ?? INITIAL_READABLE_ANIMATION_FRAME,
    options.preserve,
  )
  return compacted
}

const vectorsEqual = (first: readonly number[], second: readonly number[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index])

export const compiledMotionFramesHaveEqualPlayback = (
  first: readonly (MotionDataCompiled | MotionPathDataCompiled)[],
  second: readonly (MotionDataCompiled | MotionPathDataCompiled)[],
): boolean =>
  first.length === second.length &&
  first.every((frame, index) => {
    const comparison = second[index]
    if (
      comparison === undefined ||
      ('beats' in frame && 'beats' in comparison && frame.beats !== comparison.beats) ||
      frame.precision !== comparison.precision ||
      frame.shape !== comparison.shape ||
      frame.distance !== comparison.distance ||
      !vectorsEqual(frame.move, comparison.move) ||
      !vectorsEqual(frame.direction, comparison.direction) ||
      !vectorsEqual(frame.delta, comparison.delta) ||
      !vectorsEqual(frame.offset, comparison.offset)
    ) {
      return false
    }

    return (
      frame.shape === MOTION_SHAPE.LINE ||
      (frame.amount === comparison.amount && vectorsEqual(frame.curve, comparison.curve))
    )
  })

/**
 * Mutates Motion frames only when recompiling the complete track proves playback is unchanged.
 * Explicit zero direction commands are therefore retained when their presence changes playback
 * direction, while no-op zero commands may still be removed.
 */
export const compressMotionFrames = (
  frames: MotionData[],
  options: CompressMotionFramesOptions = {},
): number => {
  const { preserve, ...compileOptions } = options
  const expected = compileMotionTrack(frames, compileOptions)
  let removed = 0

  let passRemoved: number
  do {
    passRemoved = 0
    frames.forEach((frame, frameIndex) => {
      for (const key of MOTION_FRAME_KEYS) {
        const original = frame[key]
        if (original === undefined || preserve?.(frameIndex, key) === true) continue

        delete frame[key]
        if (
          compiledMotionFramesHaveEqualPlayback(
            expected,
            compileMotionTrack(frames, compileOptions),
          )
        ) {
          passRemoved++
        } else {
          Object.assign(frame, { [key]: original })
        }
      }
    })
    removed += passRemoved
  } while (passRemoved > 0)

  return removed
}
