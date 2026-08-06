import { MathUtils, Vector3 } from 'three'

import { MOTION_SHAPE } from '@/domain/animation/AnimStruct'
import { InitialOrtho, InitialPoint, orthoAngle, orthoNext } from '@/math/animation/OrthogonalFunc'
import type { MotionShapeInd } from '@/types/AnimTypes'

export type MotionAngles = [plane: number, arc: number, distance: number]
export type MotionCartesian = [x: number, y: number, z: number]

export const MAX_MOTION_DISTANCE = 62
export const DEFAULT_MOTION_AMOUNT = 50

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

const pathTangent = new Vector3()
const pathCurve = new Vector3()
const pathInitial = new Vector3()
const pathNormal = new Vector3()
