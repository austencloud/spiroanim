import { describe, expect, it } from 'vitest'

import {
  animationEndpointsAlign,
  shiftAnimationFrames,
} from '@/features/editor/manage/shiftAnimationFrames'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { AnimData, RootData } from '@/types/AnimTypes'

const compileFrames = (frames: AnimData[]) =>
  rootCompile(
    rootFinal({
      bpm: 120,
      prop: 0,
      color: 0,
      smooth: true,
      guides: false,
      paths: true,
      hands: true,
      visible: true,
      nodes: false,
      anchors: false,
      props: [{ anim: frames }],
      aspectx: 1,
      aspecty: 1,
      distance: 22,
      thick: 4,
    } satisfies RootData),
  ).props[0]!.anim

const expectVectorClose = (actual: readonly number[], expected: readonly number[]) => {
  actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(expected[axis]!, 9))
}

const closedFrames: AnimData[] = [
  { arc: 0, beats: 2, scale: 8, depth: 1, move: [1, 0, 0] },
  { arc: 90, beats: 3, scale: 9, depth: 2, move: [2, 0, 0] },
  { arc: 90, plane: 180, beats: 4, scale: 10, depth: 3, move: [3, 0, 0] },
]

describe('shiftAnimationFrames', () => {
  it('requires both compiled position and rotation to close', () => {
    const compiled = compileFrames(closedFrames)
    expect(animationEndpointsAlign(compiled)).toBe(true)

    const mismatchedRotation = structuredClone(compiled)
    mismatchedRotation.at(-1)!.rot = [1, 0, 0]

    expect(animationEndpointsAlign(mismatchedRotation)).toBe(false)
    expect(shiftAnimationFrames(closedFrames, mismatchedRotation)).toBeUndefined()
  })

  it('rotates every visible segment and moves the first duration to the end', () => {
    const compiled = compileFrames(closedFrames)
    const shifted = shiftAnimationFrames(closedFrames, compiled)
    expect(shifted).toBeDefined()

    const result = compileFrames(shifted!)
    const stateIndices = [1, 2, 1]
    for (const [index, frame] of result.entries()) {
      const expected = compiled[stateIndices[index]!]!
      expectVectorClose(frame.pos, expected.pos)
      expectVectorClose(frame.rot, expected.rot)
      expect(frame.scale).toBe(expected.scale)
      expect(frame.depth).toBe(expected.depth)
    }

    const incomingSegmentIndices = [2, 1]
    for (const [index, frame] of result.slice(1).entries()) {
      const expected = compiled[incomingSegmentIndices[index]!]!
      expectVectorClose(frame.posx, expected.posx)
      expectVectorClose(frame.rotx, expected.rotx)
      expect(frame).toMatchObject({
        arc: expected.arc,
        turns: expected.turns,
        adjust: expected.adjust,
        type: expected.type,
      })
    }

    expect(result.map(({ beats }) => beats)).toEqual([3, 2, 2])
    expect(result.map(({ move }) => move)).toEqual([
      [3, 0, 0],
      [3, 0, 0],
      [2, 0, 0],
    ])
    expect(closedFrames[0]).toEqual({
      arc: 0,
      beats: 2,
      scale: 8,
      depth: 1,
      move: [1, 0, 0],
    })
  })

  it('omits values that can use defaults or inherit from the preceding frame', () => {
    const frames: AnimData[] = [
      { arc: 0, beats: 2, scale: 8 },
      { arc: 90, beats: 2, scale: 8 },
      { arc: 90, plane: 180, beats: 2, scale: 8 },
    ]

    const shifted = shiftAnimationFrames(frames, compileFrames(frames))

    expect(shifted).toBeDefined()
    expect(shifted).toEqual([{ arc: 90, beats: 2, scale: 8 }, { plane: -180 }, { plane: -180 }])
  })

  it('rejects animations without a complete loop interval', () => {
    const frames: AnimData[] = [{ arc: 0 }, { arc: 0 }]

    expect(shiftAnimationFrames(frames, compileFrames(frames))).toBeUndefined()
  })

  it('rejects animations whose final position does not match the first', () => {
    const frames: AnimData[] = [{ arc: 0 }, { arc: 45 }, { arc: 45 }]
    const compiled = compileFrames(frames)

    expect(animationEndpointsAlign(compiled)).toBe(false)
    expect(shiftAnimationFrames(frames, compiled)).toBeUndefined()
  })
})
