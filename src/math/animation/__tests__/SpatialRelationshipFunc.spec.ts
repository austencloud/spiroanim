import { describe, expect, it } from 'vitest'

import {
  deriveBoxInitialPlacement,
  deriveOrthogonalPosition,
  deriveSphericalMidpoint,
  getInitialPositionGeometry,
} from '@/math/animation/SpatialRelationshipFunc'
import { InitialOrtho } from '@/math/animation/OrthogonalFunc'

describe('spatial relationship geometry', () => {
  it('derives an orthogonal position from a position and its transported VTG axis', () => {
    const { position, axis } = getInitialPositionGeometry({ arc: 90, plane: 180 })
    const orthogonalPosition = deriveOrthogonalPosition(position, axis)

    expect(orthogonalPosition.length()).toBeCloseTo(1, 10)
    expect(orthogonalPosition.dot(position)).toBeCloseTo(0, 10)
    expect(orthogonalPosition.dot(axis)).toBeCloseTo(0, 10)
  })

  it('derives Box placement as the spherical midpoint of VTG relationship vectors', () => {
    const source = getInitialPositionGeometry({ arc: 90, plane: 180 })
    const orthogonalPosition = deriveOrthogonalPosition(
      source.position,
      source.axis,
    ).multiplyScalar(Math.sign(source.planeDirection.dot(InitialOrtho)))
    const expectedPosition = deriveSphericalMidpoint(source.position, orthogonalPosition)
    const boxPlacement = deriveBoxInitialPlacement({ arc: 90, plane: 180 })
    const boxPosition = getInitialPositionGeometry(boxPlacement).position

    expect(boxPosition.distanceTo(expectedPosition)).toBeCloseTo(0, 10)
    expect(boxPosition.dot(source.position)).toBeCloseTo(boxPosition.dot(orthogonalPosition), 10)
  })
})
