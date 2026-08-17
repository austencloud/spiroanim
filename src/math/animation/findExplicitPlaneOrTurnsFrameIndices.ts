import type { RootDataFinal } from '@/types/AnimTypes'

/**
 * Finds authored relationship-change frames without compiling inherited values. Frames before the
 * requested index are ignored, and a frame is returned once even when multiple props explicitly
 * set Plane or Turns there.
 */
export const findExplicitPlaneOrTurnsFrameIndices = (
  animation: RootDataFinal,
  startFrameIndex = 2,
): readonly number[] => {
  const frameCount = Math.max(0, ...animation.props.map((prop) => prop.anim.length))
  const indices: number[] = []

  for (let frameIndex = Math.max(0, startFrameIndex); frameIndex < frameCount; frameIndex += 1) {
    const hasExplicitRelationship = animation.props.some((prop) => {
      const frame = prop.anim[frameIndex]
      return frame?.plane !== undefined || frame?.turns !== undefined
    })
    if (hasExplicitRelationship) indices.push(frameIndex)
  }

  return indices
}
