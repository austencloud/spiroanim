import { describe, expect, it } from 'vitest'

import { fitToAspect } from '@/math/aspectRatio'

describe('fitToAspect', () => {
  it('preserves dimensions already within the player tolerance', () => {
    expect(fitToAspect(1918, 1080, 16 / 9)).toEqual({
      width: 1918,
      height: 1080,
      mode: 0,
    })
  })

  it('fits landscape and portrait ratios within both bounds', () => {
    expect(fitToAspect(1000, 1000, 16 / 9)).toEqual({
      width: 1000,
      height: 562.5,
      mode: 2,
    })
    expect(fitToAspect(1000, 1000, 9 / 16)).toEqual({
      width: 562.5,
      height: 1000,
      mode: 1,
    })
  })
})
