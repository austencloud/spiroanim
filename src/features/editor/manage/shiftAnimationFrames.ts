import { MathUtils, Vector3 } from 'three'

import { TTYPE } from '@/domain/animation/AnimStruct'
import { InitialOrtho, InitialPoint, orthoAngle, orthoNext } from '@/math/animation/OrthogonalFunc'
import type { AnimData, AnimDataCompiled } from '@/types/AnimTypes'
import { cartesianMovesToAngles } from '@/math/animation/MoveFunc'

const endpointTolerance = 1e-6
const integerSnapTolerance = 1e-9

export interface ShiftAnimationRangeOptions {
  allowEndpointMismatch?: boolean
  preserveFinalOutgoing?: boolean
}

const vectorsAlign = (first: readonly number[], second: readonly number[]) =>
  first.length === second.length &&
  first.every((value, index) => Math.abs(value - second[index]!) <= endpointTolerance)

export const animationRangeEndpointsAlign = (
  frames: readonly AnimDataCompiled[],
  startIndex: number,
  endIndex: number,
) => {
  const first = frames[startIndex]
  const last = frames[endIndex]
  return (
    endIndex - startIndex >= 2 &&
    first !== undefined &&
    last !== undefined &&
    vectorsAlign(first.pos, last.pos) &&
    vectorsAlign(first.rot, last.rot)
  )
}

export const animationEndpointsAlign = (frames: readonly AnimDataCompiled[]) =>
  animationRangeEndpointsAlign(frames, 0, frames.length - 1)

const snapNumber = (value: number) => {
  const nearestInteger = Math.round(value)
  const snapped =
    Math.abs(value - nearestInteger) <= integerSnapTolerance
      ? nearestInteger
      : Math.round(value * 1e9) / 1e9
  return Object.is(snapped, -0) ? 0 : snapped
}

const snapSignedAngle = (radians: number) => {
  const degrees = MathUtils.radToDeg(radians)
  const wrapped = MathUtils.euclideanModulo(degrees + 180, 360) - 180
  return snapNumber(wrapped)
}

const planeFromCross = (
  source: Vector3,
  cross: Vector3,
  reference: Vector3,
  orthogonal: Vector3,
) => {
  orthogonal.crossVectors(cross, source).normalize()
  return orthoAngle(source, orthogonal, reference)
}

const signedRotationAround = (source: Vector3, target: Vector3, axis: Vector3, cross: Vector3) => {
  cross.crossVectors(source, target)
  return Math.atan2(axis.dot(cross), source.dot(target))
}

const isZeroMove = (move: readonly number[]) => move.every((coordinate) => coordinate === 0)

const compactFrames = (frames: readonly AnimData[], preceding?: AnimDataCompiled) =>
  frames.map((frame, index) => {
    const compacted = { ...frame }
    const previous = index === 0 ? preceding : frames[index - 1]

    if (compacted.turns === (previous?.turns ?? 0)) delete compacted.turns
    if (compacted.beats === (previous?.beats ?? 1)) delete compacted.beats
    if (compacted.scale === (previous?.scale ?? 10)) delete compacted.scale
    if (compacted.depth === (previous?.depth ?? 0)) delete compacted.depth
    if (compacted.type === (previous?.type ?? TTYPE.SPHE)) delete compacted.type
    if (compacted.adjust === (previous?.adjust ?? 0)) delete compacted.adjust
    if (compacted.arc === (previous?.arc ?? 0)) delete compacted.arc

    const plane = compacted.plane ?? 0
    if ((compacted.axis ?? plane) === plane) delete compacted.axis
    if (compacted.plane === 0) delete compacted.plane
    if (compacted.move !== undefined && isZeroMove(compacted.move)) delete compacted.move

    return compacted
  })

/**
 * Rotates a closed animation by one displayed interval.
 *
 * The first frame in the shifted range is rebuilt from the preceding compiled
 * state, or from the application's fixed basis when the range begins at frame 0.
 * Relative angles are recalculated from compiled axes so every visible spatial
 * path stays intact.
 */
export const shiftAnimationFrameRange = (
  frames: readonly AnimData[],
  compiled: readonly AnimDataCompiled[],
  startIndex: number,
  endIndex: number,
  options: ShiftAnimationRangeOptions = {},
): AnimData[] | undefined => {
  if (
    compiled.length !== frames.length ||
    startIndex < 0 ||
    endIndex >= frames.length ||
    (!options.allowEndpointMismatch &&
      !animationRangeEndpointsAlign(compiled, startIndex, endIndex))
  ) {
    return undefined
  }

  const position = InitialPoint.clone()
  const positionReference = InitialOrtho.clone()
  const rotation = InitialPoint.clone()
  const rotationReference = InitialOrtho.clone()

  const rangeLength = endIndex - startIndex + 1
  const lastOutputIndex = rangeLength - 1
  const targetIndices = [
    ...Array.from({ length: lastOutputIndex }, (_, index) => startIndex + index + 1),
    startIndex + 1,
  ]
  const preserveFinalOutgoing = options.preserveFinalOutgoing ?? false
  const originalEnd = compiled[endIndex]!

  const targetPosition = new Vector3()
  const targetRotation = new Vector3()
  const targetAdjustment = new Vector3()
  const targetPositionAxis = new Vector3()
  const targetRotationAxis = new Vector3()
  const orthogonal = new Vector3()
  const rotationAxis = new Vector3()
  const rotationCross = new Vector3()
  const shiftedFirstPosition = new Vector3()
  const shiftedFirstRotation = new Vector3()

  if (startIndex > 0) {
    const preceding = compiled[startIndex - 1]!
    position.fromArray(preceding.pos)
    positionReference
      .copy(position)
      .applyAxisAngle(targetPositionAxis.fromArray(preceding.posx), Math.PI / 2)
    rotation.fromArray(preceding.rot)
    rotationReference
      .copy(rotation)
      .applyAxisAngle(targetRotationAxis.fromArray(preceding.rotx), Math.PI / 2)
  }

  const shifted = targetIndices.map((targetIndex, outputIndex): AnimData => {
    const target = compiled[targetIndex]!
    const rebuildStart = outputIndex === 0
    const preserveOutgoing = preserveFinalOutgoing && outputIndex === lastOutputIndex
    targetPosition.fromArray(target.pos)
    targetRotation.fromArray(target.rot)

    const arcRadians = rebuildStart
      ? position.angleTo(targetPosition)
      : MathUtils.degToRad(target.arc)
    const planeRadians = rebuildStart
      ? orthoAngle(position, targetPosition, positionReference)
      : planeFromCross(
          position,
          targetPositionAxis.fromArray(target.posx),
          positionReference,
          orthogonal,
        )
    orthoNext(planeRadians, arcRadians, position, positionReference)

    if (outputIndex === 0) shiftedFirstPosition.copy(position)

    const targetRotationRadians =
      MathUtils.degToRad(target.turns) +
      (target.type === TTYPE.SPHE ? MathUtils.degToRad(target.arc) : 0)
    const rotationRadians = rebuildStart ? rotation.angleTo(targetRotation) : targetRotationRadians
    const axisRadians = rebuildStart
      ? orthoAngle(rotation, targetRotation, rotationReference)
      : planeFromCross(
          rotation,
          targetRotationAxis.fromArray(target.rotx),
          rotationReference,
          orthogonal,
        )
    orthoNext(axisRadians, rotationRadians, rotation, rotationReference, rotationAxis)
    if (outputIndex === 0) shiftedFirstRotation.copy(rotation)

    const adjust =
      outputIndex === 0
        ? MathUtils.radToDeg(
            signedRotationAround(
              rotation,
              targetAdjustment.fromArray(target.adju),
              rotationAxis,
              rotationCross,
            ),
          )
        : target.adjust

    const move =
      outputIndex === 0
        ? ([
            compiled[startIndex]!.move[0] + compiled[startIndex + 1]!.move[0],
            compiled[startIndex]!.move[1] + compiled[startIndex + 1]!.move[1],
            compiled[startIndex]!.move[2] + compiled[startIndex + 1]!.move[2],
          ] satisfies [number, number, number])
        : preserveOutgoing
          ? ([0, 0, 0] satisfies [number, number, number])
          : ([...target.move] satisfies [number, number, number])

    return {
      turns: snapNumber(
        MathUtils.radToDeg(rotationRadians) -
          (target.type === TTYPE.SPHE ? MathUtils.radToDeg(arcRadians) : 0),
      ),
      beats: preserveOutgoing
        ? originalEnd.beats
        : compiled[outputIndex < lastOutputIndex - 1 ? startIndex + outputIndex + 1 : startIndex]!
            .beats,
      scale: preserveOutgoing ? originalEnd.scale : target.scale,
      depth: preserveOutgoing ? originalEnd.depth : target.depth,
      type: target.type,
      adjust: snapNumber(preserveOutgoing ? originalEnd.adjust : adjust),
      arc: snapNumber(MathUtils.radToDeg(arcRadians)),
      plane: snapSignedAngle(planeRadians),
      axis: snapSignedAngle(axisRadians),
      move,
    }
  })

  const angularMoves = cartesianMovesToAngles(shifted.map((frame) => frame.move ?? [0, 0, 0]))
  shifted.forEach((frame, index) => {
    if (frame.move !== undefined) {
      const target = compiled[targetIndices[index]!]!
      const angularMove = angularMoves[index]!
      frame.move = [angularMove[0], angularMove[1], angularMove[2], target.curveAxis, target.bend]
    }
  })

  if (
    !options.allowEndpointMismatch &&
    (!vectorsAlign(position.toArray(), shiftedFirstPosition.toArray()) ||
      !vectorsAlign(rotation.toArray(), shiftedFirstRotation.toArray()))
  ) {
    return undefined
  }

  return compactFrames(shifted, startIndex > 0 ? compiled[startIndex - 1] : undefined)
}

export const shiftAnimationFrames = (
  frames: readonly AnimData[],
  compiled: readonly AnimDataCompiled[],
): AnimData[] | undefined => shiftAnimationFrameRange(frames, compiled, 0, frames.length - 1)
