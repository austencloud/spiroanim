import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgPatternSelection } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import type { AnimData, RootDataFinal } from '@/types/AnimTypes'

const doubledFourBeatIntervalCount = 8

const normalizeTravelPlane = (plane: number): 0 | 180 =>
  Math.abs(((plane % 360) + 360) % 360) === 180 ? 180 : 0

const createAppendedFrames = (
  frames: readonly AnimData[],
  compiledFrames: ReturnType<typeof rootCompile>['props'][number]['anim'],
): AnimData[] | undefined => {
  // The 180 control transforms the original first frame. Preserve that direction before the
  // frame is removed, even when the following authored frame explicitly sets its own Plane.
  const sourceDirection = compiledFrames[0]?.plane
  const sourceTurns = compiledFrames[1]?.turns
  if (frames.length < 2 || sourceDirection === undefined || sourceTurns === undefined) {
    return undefined
  }

  const appended = frames.slice(1, doubledFourBeatIntervalCount + 1).map((frame) => ({ ...frame }))
  const firstFrame = appended[0]
  if (!firstFrame) return undefined
  firstFrame.plane = normalizeTravelPlane(sourceDirection)
  firstFrame.turns = sourceTurns

  // Starting-beat shifts can carry the source cycle's closing relationship into the middle of the
  // extracted block. In Builder this drop represents one relationship piece, so only its new first
  // frame may define Plane or Turns.
  for (const frame of appended.slice(1)) {
    delete frame.plane
    delete frame.turns
  }

  while (appended.length < doubledFourBeatIntervalCount) appended.push({})
  return appended
}

const createBuilderPieceFrames = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): AnimData[][] | undefined => {
  const source = createVtgAnimation(current, selection)
  if (!source || source.props.length !== current.props.length) return undefined

  const compiledSource = rootCompile(source)
  const framesByProp = source.props.map((prop, index) => {
    const compiledProp = compiledSource.props[index]
    return compiledProp ? createAppendedFrames(prop.anim, compiledProp.anim) : undefined
  })
  return framesByProp.some((frames) => frames === undefined)
    ? undefined
    : framesByProp.map((frames) => frames!)
}

const prependVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const source = createVtgAnimation(current, selection)
  if (!source || source.props.length !== current.props.length) return undefined
  const compiledSource = rootCompile(source)
  const compiledCurrent = rootCompile(current)

  return {
    ...current,
    props: current.props.map((prop, index) => {
      const sourceProp = source.props[index]
      const compiledSourceProp = compiledSource.props[index]
      const compiledCurrentProp = compiledCurrent.props[index]
      if (!sourceProp || !compiledSourceProp || !compiledCurrentProp) return prop

      const inserted = sourceProp.anim.slice(0, doubledFourBeatIntervalCount + 1).map((frame) => ({
        ...frame,
      }))
      while (inserted.length < doubledFourBeatIntervalCount + 1) inserted.push({})
      const insertedRelationship = inserted[1]
      if (insertedRelationship) {
        insertedRelationship.plane = normalizeTravelPlane(compiledSourceProp.anim[1]?.plane ?? 0)
        insertedRelationship.turns = compiledSourceProp.anim[1]?.turns ?? 0
      }
      for (const frame of inserted.slice(2)) {
        delete frame.plane
        delete frame.turns
      }

      const following = prop.anim.slice(1).map((frame) => ({ ...frame }))
      const followingRelationship = following[0]
      if (followingRelationship) {
        followingRelationship.plane = normalizeTravelPlane(compiledCurrentProp.anim[0]?.plane ?? 0)
        followingRelationship.arc = compiledCurrentProp.anim[1]?.arc ?? 0
        followingRelationship.turns = compiledCurrentProp.anim[1]?.turns ?? 0
      }

      return { ...prop, anim: [...inserted, ...following] }
    }),
  }
}

/** Appends a dragged VTG cell as one doubled four-beat Builder piece. */
export const appendVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  if (current.props.length === 0) return createVtgAnimation(current, selection)

  const appendedByProp = createBuilderPieceFrames(current, selection)
  if (!appendedByProp) return undefined

  return {
    ...current,
    props: current.props.map((prop, index) => ({
      ...prop,
      // Keep the existing endpoint. The appended relationship frame follows it, which lets the
      // preview extractor use that endpoint as the shared start of the new four-beat piece.
      anim: [...prop.anim.map((frame) => ({ ...frame })), ...appendedByProp[index]!],
    })),
  }
}

/** Inserts a dragged VTG cell before an existing Builder preview. */
export const insertVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
  previewIndex: number,
): RootDataFinal | undefined => {
  if (!current.props[0]) return undefined
  if (previewIndex === 0) return prependVtgBuilderPattern(current, selection)

  const relationshipFrames = findExplicitPlaneOrTurnsFrameIndices(current, 2)
  const sliceStarts = [0, ...relationshipFrames.map((frameIndex) => frameIndex - 1)]
  const targetStart = sliceStarts[previewIndex]
  if (targetStart === undefined) return undefined

  const insertedByProp = createBuilderPieceFrames(current, selection)
  if (!insertedByProp) return undefined
  const insertionIndex = targetStart + 1
  const compiledCurrent = rootCompile(current)

  return {
    ...current,
    props: current.props.map((prop, index) => {
      const following = prop.anim.slice(insertionIndex).map((frame) => ({ ...frame }))
      const followingRelationship = following[0]
      const compiledFollowingRelationship = compiledCurrent.props[index]?.anim[insertionIndex]
      if (followingRelationship && compiledFollowingRelationship) {
        // ARC and Turns inherit across empty frames. Materialize the target's effective values so
        // the inserted piece cannot replace its relationship state at the new junction.
        followingRelationship.arc = compiledFollowingRelationship.arc
        followingRelationship.turns = compiledFollowingRelationship.turns
      }

      return {
        ...prop,
        // Keep the target's shared starting position. Its relationship frame and every following
        // authored frame shift forward after the inserted piece.
        anim: [
          ...prop.anim.slice(0, insertionIndex).map((frame) => ({ ...frame })),
          ...insertedByProp[index]!,
          ...following,
        ],
      }
    }),
  }
}
