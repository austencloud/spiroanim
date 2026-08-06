import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'

import {
  angularMovesToCartesian,
  cartesianMovesToAngles,
  clampCartesianMove,
  createMoveDirectionState,
  moveAnglesToCartesian,
  moveCurveOffset,
} from '@/math/animation/MoveFunc'

describe('Move angle conversion', () => {
  it('converts legacy Cartesian moves into equivalent chained angles', () => {
    const cartesian = [
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, -4],
    ] as const

    const angular = cartesianMovesToAngles(cartesian)
    const restored = angularMovesToCartesian(angular)

    restored.forEach((move, index) => {
      expect(move[0]).toBeCloseTo(cartesian[index]![0], 6)
      expect(move[1]).toBeCloseTo(cartesian[index]![1], 6)
      expect(move[2]).toBeCloseTo(cartesian[index]![2], 6)
    })
  })

  it('supports the farthest legacy cube corner', () => {
    expect(cartesianMovesToAngles([[30, 30, 30]])[0]![2]).toBe(52)
  })

  it('preserves initial positive and negative depth directions', () => {
    for (const move of [
      [0, 0, -14],
      [0, 0, 14],
    ] as const) {
      expect(angularMovesToCartesian(cartesianMovesToAngles([move]))[0]).toEqual(move)
    }
  })

  it('rounds Cartesian edits and keeps their combined distance encodable', () => {
    expect(clampCartesianMove([12.4, -8.6, 3.5])).toEqual([12, -9, 4])

    const clamped = clampCartesianMove([62, 62, 62])
    expect(clamped.every(Number.isInteger)).toBe(true)
    expect(Math.hypot(...clamped)).toBeLessThanOrEqual(62)
    expect(clamped).toEqual([35, 35, 35])
  })

  it('creates a signed midpoint curve perpendicular to the Move direction', () => {
    const state = createMoveDirectionState()
    const move = [0, 90, 10, 0, 50] as const
    const direction = new Vector3().fromArray(moveAnglesToCartesian(move, state))
    const curve = new Vector3().fromArray(moveCurveOffset(move, state))

    expect(curve.length()).toBeCloseTo(5)
    expect(curve.dot(direction)).toBeCloseTo(0)

    const oppositeState = createMoveDirectionState()
    moveAnglesToCartesian(move, oppositeState)
    const opposite = new Vector3().fromArray(moveCurveOffset([0, 90, 10, 0, -50], oppositeState))
    expect(opposite.toArray()).toEqual(curve.clone().negate().toArray())
  })
})
