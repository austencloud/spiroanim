import { PROPCP } from '@/domain/animation/AnimStruct'
import { compressAnimationFrames, compressMotionFrames } from '@/math/animation/compressFrames'
import { createDefaultCameraFrame } from '@/math/animation/MotionFunc'
import type { CameraData, PropDataFinal, RootDataFinal } from '@/types/AnimTypes'

export { compressAnimationFrames, compressMotionFrames }

export interface CompressAnimationOptions {
  /** Remove Prop values that are identical to their inherited Root values. */
  propValues?: boolean
  animation?: boolean
  motion?: boolean
  camera?: boolean
}

const compressProp = (
  root: RootDataFinal,
  prop: PropDataFinal,
  options: Required<Omit<CompressAnimationOptions, 'camera'>>,
): number => {
  let removed = 0
  if (options.propValues) {
    for (const key of PROPCP) {
      if (prop[key] !== undefined && prop[key] === root[key]) {
        delete prop[key]
        removed++
      }
    }
  }
  if (options.animation) removed += compressAnimationFrames(prop.anim)
  if (options.motion) removed += compressMotionFrames(prop.motion)
  return removed
}

export const compressCameraFrames = (frames: CameraData[]): number => {
  const defaultOrbit = createDefaultCameraFrame().orbit!
  return (
    compressMotionFrames(
      frames.map((frame) => frame.orbit ?? {}),
      { firstFrameDefaults: defaultOrbit },
    ) + compressMotionFrames(frames.map((frame) => frame.center ?? {}))
  )
}

/** Removes authored values that do not affect the animation's current compiled playback. */
export const compressAnimation = (
  root: RootDataFinal,
  options: CompressAnimationOptions = {},
): number => {
  const resolvedOptions = {
    propValues: options.propValues ?? true,
    animation: options.animation ?? true,
    motion: options.motion ?? true,
    camera: options.camera ?? true,
  }
  const cameraRemoved = resolvedOptions.camera ? compressCameraFrames(root.camera) : 0
  return (
    cameraRemoved +
    root.props.reduce((removed, prop) => removed + compressProp(root, prop, resolvedOptions), 0)
  )
}
