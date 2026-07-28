import { describe, expect, it } from 'vitest'

import { reverseAngle } from '@/math/animation/AngleFunc'

describe('AngleFunc', () => {
  it.each([
    [0, 180],
    [180, 0],
    [-180, 0],
    [90, -90],
    [-90, 90],
  ])('reverses %s degrees to %s degrees', (value, expected) => {
    expect(reverseAngle(value)).toBe(expected)
  })
})
