import type { MotionData, RootDataFinal } from '@/types/AnimTypes'
import { cartesianToMotionAngles, createMotionDirectionState } from '@/math/animation/MotionFunc'

const hasLegacyMove = (move: readonly number[] | undefined): move is [number, number, number] =>
  move !== undefined

/**
 * Moves legacy Cartesian MOVE values out of Animation frames while preserving their exact timing.
 * Stationary spans are collapsed, but the source frame immediately before each MOVE remains so its
 * outgoing Beats still controls the transition into that MOVE.
 */
export function migrateLegacyMotion(root: RootDataFinal): RootDataFinal {
  const migrated = structuredClone(root)

  for (const prop of migrated.props) {
    const frames = prop.anim
    const moveIndices = frames
      .map((frame, index) => (hasLegacyMove(frame.move) ? index : -1))
      .filter((index) => index >= 0)

    if (moveIndices.length === 0) {
      prop.motion = []
      for (const frame of frames) delete frame.move
      continue
    }

    const effectiveBeats: number[] = []
    let inheritedBeats = 1
    for (const frame of frames) {
      inheritedBeats = frame.beats ?? inheritedBeats
      effectiveBeats.push(inheritedBeats)
    }

    const retained = new Set<number>([0])
    for (const index of moveIndices) {
      retained.add(index)
      if (index > 0) retained.add(index - 1)
    }
    const indices = [...retained].sort((first, second) => first - second)
    const directionState = createMotionDirectionState()
    const motion: MotionData[] = indices.map((frameIndex, outputIndex) => {
      const frame: MotionData = {}
      const move = frames[frameIndex]?.move
      if (move !== undefined) {
        const [plane, arc, distance] = cartesianToMotionAngles(move, directionState)
        frame.plane = plane
        frame.arc = arc
        frame.distance = distance
      }

      const nextIndex = indices[outputIndex + 1]
      if (nextIndex !== undefined) {
        frame.beats = effectiveBeats
          .slice(frameIndex, nextIndex)
          .reduce((total, beats) => total + beats, 0)
      }
      return frame
    })

    prop.motion = motion
    for (const frame of frames) delete frame.move
  }

  return migrated
}
