import { MathUtils, Quaternion, Vector3 } from 'three'

import { MOTION_SHAPE } from '@/domain/animation/AnimStruct'
import {
  DEFAULT_MOTION_AMOUNT,
  resolveMotionFrames,
  type ResolveMotionFramesOptions,
} from '@/math/animation/frameSemantics'
import { InitialOrtho, InitialPoint, orthoAngle, orthoNext } from '@/math/animation/OrthogonalFunc'
import type {
  CameraData,
  MotionData,
  MotionDataCompiled,
  MotionPathDataCompiled,
  MotionShapeInd,
} from '@/types/AnimTypes'

export type MotionAngles = [plane: number, arc: number, distance: number]
export type MotionCartesian = [x: number, y: number, z: number]

export const MAX_MOTION_DISTANCE = 62
export { DEFAULT_MOTION_AMOUNT }
export const DEFAULT_CAMERA_DISTANCE = 22
export const PRECISION_DISTANCE_DIVISOR = 10

export interface MotionDirectionState {
  direction: Vector3
  reference: Vector3
}

export const createMotionDirectionState = (): MotionDirectionState => ({
  direction: InitialPoint.clone(),
  reference: InitialOrtho.clone(),
})

export const clampCartesianMotion = (
  move: readonly number[],
  maximum = MAX_MOTION_DISTANCE,
): MotionCartesian => {
  const rounded: MotionCartesian = [
    Math.round(move[0] ?? 0),
    Math.round(move[1] ?? 0),
    Math.round(move[2] ?? 0),
  ]
  for (let index = 0; index < rounded.length; index++) {
    if (Object.is(rounded[index], -0)) rounded[index] = 0
  }
  const distance = Math.hypot(...rounded)
  if (distance <= maximum) return rounded

  const scale = maximum / distance
  // Truncation guarantees rounding cannot push the vector back outside the Distance boundary.
  return rounded.map((coordinate) => {
    const clamped = Math.trunc(coordinate * scale)
    return Object.is(clamped, -0) ? 0 : clamped
  }) as MotionCartesian
}

export const motionAnglesToCartesian = (
  motion: readonly number[],
  state: MotionDirectionState,
): MotionCartesian => {
  const plane = motion[0] ?? 0
  const arc = motion[1] ?? 0
  const distance = motion[2] ?? 0

  orthoNext(MathUtils.degToRad(plane), MathUtils.degToRad(arc), state.direction, state.reference)

  return state.direction
    .clone()
    .multiplyScalar(distance)
    .toArray()
    .map((coordinate) => (Math.abs(coordinate) < 1e-12 ? 0 : coordinate)) as MotionCartesian
}

export const cartesianToMotionAngles = (
  motion: readonly number[],
  state: MotionDirectionState,
): MotionAngles => {
  const target = new Vector3(motion[0] ?? 0, motion[1] ?? 0, motion[2] ?? 0)
  const distance = target.length()
  if (distance === 0) return [0, 0, 0]

  target.normalize()
  const plane = MathUtils.radToDeg(orthoAngle(state.direction, target, state.reference))
  const arc = MathUtils.radToDeg(state.direction.angleTo(target))

  const roundedPlane = Math.round(plane)
  const normalizedPlane = Object.is(roundedPlane, -0) ? 0 : roundedPlane
  const roundedArc = Math.round(arc)

  // Advance from the quantized values that will actually be stored, so conversion errors do not
  // accumulate differently when the resulting Motion track is compiled again.
  orthoNext(
    MathUtils.degToRad(normalizedPlane),
    MathUtils.degToRad(roundedArc),
    state.direction,
    state.reference,
  )

  return [normalizedPlane, roundedArc, Math.round(distance)]
}

export const motionCurveDirection = (state: MotionDirectionState, axis: number): MotionCartesian =>
  state.reference
    .clone()
    .applyAxisAngle(state.direction, MathUtils.degToRad(axis))
    .normalize()
    .toArray() as MotionCartesian

export const motionSweep = (shape: MotionShapeInd, amount: number): number => {
  const percentage = Math.max(0, Math.min(amount, 100))
  if (shape === MOTION_SHAPE.LINE || percentage === 0) return 0

  if (shape === MOTION_SHAPE.CIRCLE) return MathUtils.degToRad(percentage * 3.6)

  // Arc reaches a semicircle at 50% and a 270-degree long arc at 100%.
  const degrees = percentage <= 50 ? percentage * 3.6 : 180 + (percentage - 50) * 1.8
  return MathUtils.degToRad(degrees)
}

export const motionPathOffset = (
  direction: readonly number[],
  curve: readonly number[],
  distance: number,
  shape: MotionShapeInd,
  amount: number,
  percentage: number,
  target: Vector3,
): Vector3 => {
  const progress = Math.max(0, Math.min(percentage, 1))
  const sweep = motionSweep(shape, amount)
  const tangent = pathTangent.fromArray(direction as [number, number, number])

  if (distance === 0 || sweep === 0) return target.copy(tangent).multiplyScalar(distance * progress)

  const radians = sweep * progress
  const curveDirection = pathCurve.fromArray(curve as [number, number, number])

  // Through a semicircle, curved paths remain anchored to the same endpoint as Linear. A Circle
  // beyond 50% continues around that semicircle's fixed center until it closes at 100%.
  if (shape === MOTION_SHAPE.CIRCLE && sweep > Math.PI) {
    const radius = distance / 2
    return target
      .copy(tangent)
      .multiplyScalar((1 - Math.cos(radians)) * radius)
      .addScaledVector(curveDirection, Math.sin(radians) * radius)
  }

  const halfSweep = sweep / 2
  const radius = distance / (2 * Math.sin(halfSweep))
  pathInitial
    .copy(tangent)
    .multiplyScalar(Math.cos(halfSweep))
    .addScaledVector(curveDirection, Math.sin(halfSweep))
  pathNormal
    .copy(tangent)
    .multiplyScalar(Math.sin(halfSweep))
    .addScaledVector(curveDirection, -Math.cos(halfSweep))

  return target
    .copy(pathInitial)
    .multiplyScalar(Math.sin(radians) * radius)
    .addScaledVector(pathNormal, (1 - Math.cos(radians)) * radius)
}

/** Fits the integer Motion fields whose completed path lands closest to an endpoint. */
export const fitMotionPathEndpoint = (
  endpoint: readonly number[],
  state: MotionDirectionState,
  shape: MotionShapeInd,
  amount: number,
  axis: number,
): MotionAngles => {
  const requested = new Vector3(endpoint[0] ?? 0, endpoint[1] ?? 0, endpoint[2] ?? 0)
  const sweep = motionSweep(shape, amount)
  if (shape !== MOTION_SHAPE.CIRCLE || sweep <= Math.PI) {
    return cartesianToMotionAngles(clampCartesianMotion(endpoint), state)
  }

  // A completed Circle has no nonzero endpoint. Keep the requested direction for subsequent
  // frames, while accepting that Distance cannot move this frame away from its starting point.
  if (Math.abs(sweep - Math.PI * 2) < 1e-12) {
    const [plane, arc] = cartesianToMotionAngles(clampCartesianMotion(endpoint), state)
    return [plane, arc, 0]
  }

  const initialDirection = state.direction.clone()
  const initialReference = state.reference.clone()
  const candidateState = createMotionDirectionState()
  const candidateOffset = new Vector3()
  const candidateEndpoint = new Vector3()
  let best: MotionAngles = [0, 0, 0]
  let bestError = Number.POSITIVE_INFINITY

  for (let plane = -180; plane <= 180; plane++) {
    for (let arc = 0; arc <= 180; arc++) {
      candidateState.direction.copy(initialDirection)
      candidateState.reference.copy(initialReference)
      const direction = motionAnglesToCartesian([plane, arc, 1], candidateState)
      const curve = motionCurveDirection(candidateState, axis)
      motionPathOffset(direction, curve, 1, shape, amount, 1, candidateOffset)
      const denominator = candidateOffset.lengthSq()
      if (denominator < 1e-12) continue

      const distance = Math.max(
        0,
        Math.min(MAX_MOTION_DISTANCE, Math.round(requested.dot(candidateOffset) / denominator)),
      )
      candidateEndpoint.copy(candidateOffset).multiplyScalar(distance)
      const error = candidateEndpoint.distanceToSquared(requested)
      if (error < bestError) {
        best = [plane, arc, distance]
        bestError = error
      }
    }
  }

  motionAnglesToCartesian(best, state)
  return best
}

export const compileMotionTrack = (
  frames: readonly MotionData[],
  options: ResolveMotionFramesOptions = {},
): MotionDataCompiled[] => {
  const state = createMotionDirectionState()
  const offset = new Vector3()
  const delta = new Vector3()

  return resolveMotionFrames(frames, options).map((frame) => {
    const { beats, precision, arc, plane, distance, shape, axis, amount, active } = frame
    const renderedDistance = precision ? distance / PRECISION_DISTANCE_DIVISOR : distance
    const move = active
      ? motionAnglesToCartesian([plane, arc, distance], state)
      : ([0, 0, 0] as MotionCartesian)
    const direction = cleanMotionVector(state.direction.toArray())
    const curve = cleanMotionVector(motionCurveDirection(state, axis))

    motionPathOffset(direction, curve, renderedDistance, shape, amount, active ? 1 : 0, delta)
    offset.add(delta)

    return {
      beats,
      precision,
      arc,
      plane,
      distance,
      shape,
      axis,
      amount,
      active,
      move,
      direction,
      curve,
      delta: delta.toArray(),
      offset: offset.toArray(),
    }
  })
}

export const sampleCompiledMotion = (
  motion: readonly MotionPathDataCompiled[],
  times: readonly number[],
  milliseconds: number,
  target: Vector3,
  scale = 1,
): Vector3 => {
  if (motion.length === 0) return target.set(0, 0, 0)

  let index = motion.length - 1
  for (let i = 0; i < times.length - 1; i++) {
    if (milliseconds < times[i + 1]!) {
      index = i
      break
    }
  }

  const current = motion[index]!
  const next = motion[index + 1]
  target.fromArray(current.offset)

  const start = times[index] ?? 0
  const end = times[index + 1] ?? start
  const percentage =
    end > start ? Math.max(0, Math.min((milliseconds - start) / (end - start), 1)) : 0
  if (next) {
    motionPathOffset(
      next.direction,
      next.curve,
      next.precision ? next.distance / PRECISION_DISTANCE_DIVISOR : next.distance,
      next.shape,
      next.amount,
      percentage,
      sampleDelta,
    )
    target.add(sampleDelta)
  }

  return target.multiplyScalar(scale)
}

/** Samples Orbit's Linear shape along the sphere around Center instead of across its chord. */
export const sampleCompiledOrbit = (
  motion: readonly MotionPathDataCompiled[],
  times: readonly number[],
  milliseconds: number,
  target: Vector3,
): Vector3 => {
  if (motion.length === 0) return target.set(0, 0, 0)

  let index = motion.length - 1
  for (let i = 0; i < times.length - 1; i++) {
    if (milliseconds < times[i + 1]!) {
      index = i
      break
    }
  }

  const current = motion[index]!
  const next = motion[index + 1]
  target.fromArray(current.offset)
  if (!next) return target

  const start = times[index] ?? 0
  const end = times[index + 1] ?? start
  const percentage =
    end > start ? Math.max(0, Math.min((milliseconds - start) / (end - start), 1)) : 0
  if (next.shape !== MOTION_SHAPE.LINE) {
    motionPathOffset(
      next.direction,
      next.curve,
      next.precision ? next.distance / PRECISION_DISTANCE_DIVISOR : next.distance,
      next.shape,
      next.amount,
      percentage,
      sampleDelta,
    )
    return target.add(sampleDelta)
  }

  orbitStart.fromArray(current.offset)
  orbitEnd.fromArray(next.offset)
  const startRadius = orbitStart.length()
  const endRadius = orbitEnd.length()
  if (startRadius < 1e-12 || endRadius < 1e-12) {
    return target.lerpVectors(orbitStart, orbitEnd, percentage)
  }

  orbitStart.multiplyScalar(1 / startRadius)
  orbitEnd.multiplyScalar(1 / endRadius)
  orbitRotation.setFromUnitVectors(orbitStart, orbitEnd)
  orbitInterpolation.identity().slerp(orbitRotation, percentage)
  return target
    .copy(orbitStart)
    .applyQuaternion(orbitInterpolation)
    .multiplyScalar(MathUtils.lerp(startRadius, endRadius, percentage))
}

export const createDefaultCameraFrame = (distance = DEFAULT_CAMERA_DISTANCE): CameraData => {
  const state = createMotionDirectionState()
  const [plane, arc, orbitDistance] = cartesianToMotionAngles([0, 0, -distance], state)
  return {
    orbit: { plane, arc, distance: orbitDistance },
    center: {},
  }
}

const cleanMotionVector = (vector: [number, number, number]): MotionCartesian =>
  vector.map((coordinate) => (Math.abs(coordinate) < 1e-12 ? 0 : coordinate)) as MotionCartesian

const pathTangent = new Vector3()
const pathCurve = new Vector3()
const pathInitial = new Vector3()
const pathNormal = new Vector3()
const sampleDelta = new Vector3()
const orbitStart = new Vector3()
const orbitEnd = new Vector3()
const orbitRotation = new Quaternion()
const orbitInterpolation = new Quaternion()
