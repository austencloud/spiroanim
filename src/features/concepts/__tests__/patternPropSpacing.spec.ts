import { describe, expect, it } from 'vitest'

import {
  applyPatternPropSpacing,
  getPatternPropMoves,
} from '@/features/concepts/patternPropSpacing'

describe('pattern prop spacing', () => {
  it('alternates outward movement between props', () => {
    expect(Array.from({ length: 6 }, (_, spacing) => getPatternPropMoves(spacing))).toEqual([
      [0, 0],
      [1, 0],
      [1, -1],
      [2, -1],
      [2, -2],
      [3, -2],
    ])
  })

  it('stores the horizontal moves as precise Motion frames', () => {
    const props = [{ anim: [] }, { anim: [] }]

    expect(applyPatternPropSpacing(props, {})).toEqual([
      {
        anim: [],
        motion: [{ precision: true, arc: 90, plane: 0, distance: 1 }],
      },
      { anim: [], motion: [] },
    ])
    expect(applyPatternPropSpacing(props, { spacing: 2 })).toEqual([
      {
        anim: [],
        motion: [{ precision: true, arc: 90, plane: 0, distance: 1 }],
      },
      {
        anim: [],
        motion: [{ precision: true, arc: 90, plane: 180, distance: 1 }],
      },
    ])
  })

  it('clamps spacing to its supported integer range', () => {
    expect(getPatternPropMoves(-4)).toEqual([0, 0])
    expect(getPatternPropMoves(4.6)).toEqual([3, -2])
    expect(getPatternPropMoves(30)).toEqual([10, -10])
  })
})
