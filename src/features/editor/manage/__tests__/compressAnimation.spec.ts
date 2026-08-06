import { describe, expect, it } from 'vitest'

import { MOTION_SHAPE, TTYPE } from '@/domain/animation/AnimStruct'
import { compressAnimation } from '@/features/editor/manage/compressAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { RootData } from '@/types/AnimTypes'

const createRoot = () =>
  rootFinal({
    bpm: 120,
    prop: 0,
    color: 1,
    smooth: true,
    guides: false,
    paths: true,
    travel: false,
    hands: true,
    arms: false,
    visible: true,
    nodes: false,
    anchors: false,
    props: [
      {
        prop: 0,
        color: 1,
        anim: [
          { beats: 1, turns: 0, scale: 10, depth: 0, type: TTYPE.SPHE, arc: 0, plane: 0, axis: 0 },
          { beats: 1, turns: 90, scale: 10, type: TTYPE.SPHE, arc: 0, plane: 45, axis: 45 },
        ],
        motion: [
          { beats: 1, shape: MOTION_SHAPE.LINE, axis: 90, amount: 75, distance: 2 },
          { shape: MOTION_SHAPE.ARC, amount: 75, axis: 0, distance: 3 },
          { shape: MOTION_SHAPE.ARC, amount: 75, arc: 0, plane: 0, distance: 0 },
        ],
      },
    ],
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  } satisfies RootData)

describe('compressAnimation', () => {
  it('removes redundant, default, and inapplicable values', () => {
    const root = createRoot()
    expect(compressAnimation(root)).toBeGreaterThan(0)

    expect(root.props[0]).toMatchObject({
      anim: [{}, { turns: 90, plane: 45 }],
      motion: [{ distance: 2 }, { shape: MOTION_SHAPE.ARC, amount: 75, distance: 3 }, {}],
    })
    expect(root.props[0]).not.toHaveProperty('prop')
    expect(root.props[0]).not.toHaveProperty('color')
  })

  it('preserves compiled behavior except ignored Linear curve controls', () => {
    const root = createRoot()
    const before = rootCompile(root)
    compressAnimation(root)
    const after = rootCompile(root)

    expect(after.props[0]!.anim).toEqual(before.props[0]!.anim)
    for (const index of [1, 2]) {
      expect(after.props[0]!.motion[index]).toMatchObject({
        beats: before.props[0]!.motion[index]!.beats,
        shape: before.props[0]!.motion[index]!.shape,
        amount: before.props[0]!.motion[index]!.amount,
        move: before.props[0]!.motion[index]!.move,
        delta: before.props[0]!.motion[index]!.delta,
        offset: before.props[0]!.motion[index]!.offset,
      })
    }
    expect(after.props[0]!.motion[0]).toMatchObject({ shape: MOTION_SHAPE.LINE, distance: 2 })
  })

  it('is idempotent', () => {
    const root = createRoot()
    compressAnimation(root)
    expect(compressAnimation(root)).toBe(0)
  })
})
