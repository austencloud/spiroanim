import { MathUtils, Vector3 } from 'three'

import { InitialOrtho, InitialPoint, orthoAngle, orthoNext } from '@/math/animation/OrthogonalFunc'

export type MoveAngles = [plane: number, arc: number, distance: number]
export type MoveCartesian = [x: number, y: number, z: number]
export const MAX_MOVE_DISTANCE = 62

export interface MoveDirectionState {
  direction: Vector3
  reference: Vector3
}

export const createMoveDirectionState = (): MoveDirectionState => ({
  direction: InitialPoint.clone(),
  reference: InitialOrtho.clone(),
})

export const clampCartesianMove = (
  move: readonly number[],
  maximum = MAX_MOVE_DISTANCE,
): MoveCartesian => {
  const rounded: MoveCartesian = [
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
  }) as MoveCartesian
}

export const moveAnglesToCartesian = (
  move: readonly number[],
  state: MoveDirectionState,
): MoveCartesian => {
  const plane = move[0] ?? 0
  const arc = move[1] ?? 0
  const distance = move[2] ?? 0

  orthoNext(MathUtils.degToRad(plane), MathUtils.degToRad(arc), state.direction, state.reference)

  return state.direction
    .clone()
    .multiplyScalar(distance)
    .toArray()
    .map((coordinate) => (Math.abs(coordinate) < 1e-12 ? 0 : coordinate)) as MoveCartesian
}

export const cartesianToMoveAngles = (
  move: readonly number[],
  state: MoveDirectionState,
): MoveAngles => {
  const target = new Vector3(move[0] ?? 0, move[1] ?? 0, move[2] ?? 0)
  const distance = target.length()
  if (distance === 0) return [0, 0, 0]

  target.normalize()
  const plane = MathUtils.radToDeg(orthoAngle(state.direction, target, state.reference))
  const arc = MathUtils.radToDeg(state.direction.angleTo(target))

  const roundedPlane = Math.round(plane)
  const normalizedPlane = Object.is(roundedPlane, -0) ? 0 : roundedPlane
  const roundedArc = Math.round(arc)

  // Advance from the quantized values that will actually be stored, so conversion errors do not
  // accumulate differently when the resulting animation is compiled again.
  orthoNext(
    MathUtils.degToRad(normalizedPlane),
    MathUtils.degToRad(roundedArc),
    state.direction,
    state.reference,
  )

  return [normalizedPlane, roundedArc, Math.round(distance)]
}

export const angularMovesToCartesian = (moves: readonly (readonly number[])[]) => {
  const state = createMoveDirectionState()
  return moves.map((move) => moveAnglesToCartesian(move, state))
}

export const cartesianMovesToAngles = (moves: readonly (readonly number[])[]) => {
  const state = createMoveDirectionState()
  return moves.map((move) => cartesianToMoveAngles(move, state))
}
