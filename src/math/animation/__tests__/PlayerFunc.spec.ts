import { describe, expect, it } from 'vitest'

import { MOTIONTIMES, PROPTIMES, UNQTIMES, msToBeat, rootFinal } from '@/math/animation/PlayerFunc'
import type { RootData, RootDataCompiled } from '@/types/AnimTypes'

describe('PlayerFunc', () => {
  it('adds runtime-only defaults without replacing root values', () => {
    const root: RootData = {
      bpm: 60,
      prop: 0,
      color: 0,
      smooth: false,
      guides: false,
      paths: false,
      arms: false,
      nodes: false,
      anchors: false,
      props: [],
      aspectx: 16,
      aspecty: 9,
      distance: 22,
      thick: 4,
    }

    const final = rootFinal({ ...root, props: [{ anim: [{}] }] })
    expect(final).toMatchObject({
      arms: false,
      travel: false,
      speed: 1,
      type: 0,
      turns: 0,
      depth: 0,
    })
    expect(final.props[0]!.motion).toEqual([])
  })

  it('rounds milliseconds to the nearest beat', () => {
    expect(msToBeat(999, 60)).toBe(1)
    expect(msToBeat(1501, 60)).toBe(2)
  })

  it('builds per-prop and unique animation start times', () => {
    const root = {
      bpm: 60,
      props: [
        { anim: [{ beats: 1 }, { beats: 2 }], motion: [{ beats: 2 }, {}] },
        { anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] },
      ],
    } as RootDataCompiled

    expect(PROPTIMES(root)).toEqual([
      [0, 1000],
      [0, 1000, 2000],
    ])
    expect(MOTIONTIMES(root)).toEqual([[0, 2000], []])
    expect(UNQTIMES(root)).toEqual([0, 1000, 2000])
  })
})
