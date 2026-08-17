import { describe, expect, it } from 'vitest'

import { rootFinal } from '@/math/animation/PlayerFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import type { AnimData, RootData } from '@/types/AnimTypes'

const createAnimation = (propFrames: readonly (readonly AnimData[])[]) =>
  rootFinal({
    bpm: 120,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: true,
    hands: true,
    arms: false,
    visible: true,
    nodes: false,
    anchors: false,
    props: propFrames.map((anim) => ({ anim: anim.map((frame) => ({ ...frame })) })),
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  } satisfies RootData)

describe('findExplicitPlaneOrTurnsFrameIndices', () => {
  it('finds explicit Plane or Turns values after the second frame without compiling inheritance', () => {
    const animation = createAnimation([
      [
        { plane: 180 },
        { turns: 90 },
        {},
        { plane: 0 },
        {},
        { turns: 0 },
        { plane: 180, turns: -90 },
      ],
      [{}, {}, {}, { turns: 90 }, {}, {}, { plane: 0 }],
    ])

    expect(findExplicitPlaneOrTurnsFrameIndices(animation)).toEqual([3, 5, 6])
  })

  it('accepts a reusable starting-frame boundary', () => {
    const animation = createAnimation([[{}, { turns: 90 }, { plane: 180 }, {}, { turns: -90 }]])

    expect(findExplicitPlaneOrTurnsFrameIndices(animation, 4)).toEqual([4])
  })
})
