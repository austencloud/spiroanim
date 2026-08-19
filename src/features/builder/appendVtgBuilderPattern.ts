import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import type { VtgPatternSelection } from '@/features/vtg/types'
import { getVtgBuilderMotion } from '@/features/builder/describeVtgBuilderMotion'
import { rejoinVtgBuilderJunction } from '@/features/builder/rejoinVtgBuilderJunction'
import { selectVtgBuilderJunctionPlane } from '@/features/builder/selectVtgBuilderJunctionPlane'
import { rootCompile } from '@/math/animation/AnimFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import { orthoAngle } from '@/math/animation/OrthogonalFunc'
import type { AnimData, AnimDataCompiled, RootDataFinal } from '@/types/AnimTypes'
import { MathUtils, Vector3 } from 'three'

const doubledFourBeatIntervalCount = 8
const normalizeTravelPlane = (plane: number): 0 | 180 =>
  Math.abs(((plane % 360) + 360) % 360) === 180 ? 180 : 0

const rebaseSourceTravelPlane = (
  sourceStart: AnimDataCompiled,
  sourceTarget: AnimDataCompiled,
): number => {
  const sourcePosition = new Vector3().fromArray(sourceStart.pos)
  const sourcePositionAxis = new Vector3().fromArray(sourceStart.posx)
  const sourcePositionReference = sourcePosition
    .clone()
    .applyAxisAngle(sourcePositionAxis, Math.PI / 2)
  const sourceOutgoingOrthogonal = new Vector3()
    .crossVectors(new Vector3().fromArray(sourceTarget.posx), sourcePosition)
    .normalize()
  return (
    sourceStart.plane +
    MathUtils.radToDeg(
      orthoAngle(sourcePosition, sourceOutgoingOrthogonal, sourcePositionReference),
    )
  )
}

const createAppendedFrames = (
  frames: readonly AnimData[],
  compiledFrames: ReturnType<typeof rootCompile>['props'][number]['anim'],
): AnimData[] | undefined => {
  // The extracted block drops the source endpoint at index 0. Transport the compiled outgoing
  // POSX axis to the junction, then re-solve Plane so signed source travel stays intact.
  const sourceStart = compiledFrames[0]
  const sourceTarget = compiledFrames[1]
  if (frames.length < 2 || !sourceStart || !sourceTarget) return undefined

  const appended = frames.slice(1, doubledFourBeatIntervalCount + 1).map((frame) => ({ ...frame }))
  const firstFrame = appended[0]
  if (!firstFrame) return undefined
  firstFrame.plane = rebaseSourceTravelPlane(sourceStart, sourceTarget)
  firstFrame.arc = sourceTarget.arc
  firstFrame.turns = sourceTarget.turns

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

const createStartingVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const source = createVtgAnimation(current, selection)
  if (!source || source.props.length !== current.props.length) return undefined
  const compiledSource = rootCompile(source)
  const candidate = {
    ...current,
    props: current.props.map((prop, index) => {
      const sourceProp = source.props[index]
      const compiledSourceProp = compiledSource.props[index]
      if (!sourceProp || !compiledSourceProp) return prop

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

      return { ...prop, anim: inserted }
    }),
  }
  return selectVtgBuilderJunctionPlane(candidate, 1, getVtgBuilderMotion(source))
}

const prependVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const candidate = createStartingVtgBuilderPattern(current, selection)
  return candidate
    ? rejoinVtgBuilderJunction(
        candidate,
        doubledFourBeatIntervalCount,
        current,
        0,
        getVtgBuilderMotion(current),
      )
    : undefined
}

/** Appends a dragged VTG cell as one doubled four-beat Builder piece. */
export const appendVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  if (current.props.length === 0) return createVtgAnimation(current, selection)

  const appendedByProp = createBuilderPieceFrames(current, selection)
  if (!appendedByProp) return undefined

  const appended = {
    ...current,
    props: current.props.map((prop, index) => ({
      ...prop,
      // Keep the existing endpoint. The appended relationship frame follows it, which lets the
      // preview extractor use that endpoint as the shared start of the new four-beat piece.
      anim: [...prop.anim.map((frame) => ({ ...frame })), ...appendedByProp[index]!],
    })),
  }
  const source = createVtgAnimation(current, selection)
  if (!source || source.props.length < 2 || appended.props.length < 2) return appended
  const appendTarget = current.props[0]?.anim.length
  if (appendTarget === undefined) return appended
  return selectVtgBuilderJunctionPlane(appended, appendTarget, getVtgBuilderMotion(source))
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
  const source = createVtgAnimation(current, selection)
  if (!source) return undefined
  const insertionIndex = targetStart + 1
  const inserted = {
    ...current,
    props: current.props.map((prop, index) => {
      return {
        ...prop,
        // Keep the target's shared starting position. Its relationship frame and every following
        // authored frame shift forward after the inserted piece.
        anim: [
          ...prop.anim.slice(0, insertionIndex).map((frame) => ({ ...frame })),
          ...insertedByProp[index]!,
        ],
      }
    }),
  }
  const alignedInserted = selectVtgBuilderJunctionPlane(
    inserted,
    insertionIndex,
    getVtgBuilderMotion(source),
  )
  const followingPreview = createVtgTransitionPreviewAnimations(current)?.[previewIndex]
  return alignedInserted && followingPreview
    ? rejoinVtgBuilderJunction(
        alignedInserted,
        insertionIndex + doubledFourBeatIntervalCount - 1,
        current,
        targetStart,
        getVtgBuilderMotion(followingPreview),
      )
    : undefined
}

/** Replaces the starting Builder piece without carrying its relationship into the new start. */
export const replaceFirstVtgBuilderPattern = (
  current: RootDataFinal,
  selection: VtgPatternSelection,
): RootDataFinal | undefined => {
  const previews = createVtgTransitionPreviewAnimations(current)
  const followingPreview = previews?.[1]
  if (!followingPreview) return createVtgAnimation(current, selection)

  const followingStart = findExplicitPlaneOrTurnsFrameIndices(current, 2)[0]
  const candidate = createStartingVtgBuilderPattern(current, selection)
  if (followingStart === undefined || !candidate) return undefined

  // The old starting portion is omitted; the replacement prefix is joined directly to the
  // untouched authored successor and suffix.
  return rejoinVtgBuilderJunction(
    candidate,
    doubledFourBeatIntervalCount,
    current,
    followingStart - 1,
    getVtgBuilderMotion(followingPreview),
  )
}
