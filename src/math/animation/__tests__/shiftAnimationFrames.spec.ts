import { describe, expect, it } from 'vitest'

import {
  animationEndpointsAlign,
  animationRangeEndpointsAlign,
  shiftAnimationFrameRange,
  shiftAnimationFrames,
} from '@/math/animation/shiftAnimationFrames'
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
      arms: false,
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
  { arc: 0, twist: 0, beats: 2, scale: 8, depth: 1, move: [1, 0, 0] },
  { arc: 90, twist: 90, beats: 3, scale: 9, depth: 2, move: [2, 0, 0] },
  { arc: 90, twist: -90, plane: 180, beats: 4, scale: 10, depth: 3, move: [3, 0, 0] },
]

describe('shared shiftAnimationFrames', () => {
  it('requires both compiled position and rotation to close', () => {
    const compiled = compileFrames(closedFrames)
    expect(animationEndpointsAlign(compiled)).toBe(true)

    const mismatchedRotation = structuredClone(compiled)
    mismatchedRotation.at(-1)!.rot = [1, 0, 0]

    expect(animationEndpointsAlign(mismatchedRotation)).toBe(false)
    expect(shiftAnimationFrames(closedFrames, mismatchedRotation)).toBeUndefined()

    const mismatchedTwist = structuredClone(compiled)
    mismatchedTwist.at(-1)!.twistRoll += 90

    expect(animationEndpointsAlign(mismatchedTwist)).toBe(false)
    expect(shiftAnimationFrames(closedFrames, mismatchedTwist)).toBeUndefined()
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
      expect(frame.twistRoll).toBe(expected.twistRoll)
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
    expect(closedFrames[0]).toEqual({
      arc: 0,
      twist: 0,
      beats: 2,
      scale: 8,
      depth: 1,
      move: [1, 0, 0],
    })
  })

  it('produces the same compiled result for a direct offset as repeated single shifts', () => {
    const frames: AnimData[] = [
      { arc: 0, beats: 1, scale: 8, depth: 1 },
      { arc: 90, beats: 2, scale: 9, depth: 2 },
      { arc: 90, beats: 3, scale: 10, depth: 3 },
      { arc: 90, beats: 4, scale: 11, depth: 4 },
      { arc: 90, beats: 5, scale: 12, depth: 5 },
    ]

    for (let shiftCount = 1; shiftCount <= 7; shiftCount += 1) {
      let repeated = frames
      for (let repetition = 0; repetition < shiftCount; repetition += 1) {
        repeated = shiftAnimationFrames(repeated, compileFrames(repeated))!
      }

      const direct = shiftAnimationFrames(frames, compileFrames(frames), shiftCount)
      expect(direct).toBeDefined()
      expect(compileFrames(direct!)).toEqual(compileFrames(repeated))
    }
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

  it('can shift unmatched endpoints when explicitly allowed', () => {
    const frames: AnimData[] = [
      { arc: 0, beats: 2, scale: 8 },
      { arc: 45, beats: 3, scale: 9 },
      { arc: 45, beats: 4, scale: 10 },
    ]
    const compiled = compileFrames(frames)

    const shifted = shiftAnimationFrameRange(frames, compiled, 0, frames.length - 1, {
      allowEndpointMismatch: true,
      preserveFinalOutgoing: true,
    })

    expect(shifted).toBeDefined()
    expect(compileFrames(shifted!).at(-1)).toMatchObject({
      beats: compiled.at(-1)!.beats,
      scale: compiled.at(-1)!.scale,
    })
  })

  it('shifts a closed range and preserves its outgoing boundary values', () => {
    const frames: AnimData[] = [
      { arc: 0, beats: 5, scale: 15, depth: -2, adjust: 5, move: [1, 0, 0] },
      { arc: 0, beats: 2, scale: 8, depth: 1, adjust: 10, move: [1, 0, 0] },
      { arc: 90, beats: 3, scale: 9, depth: 2, adjust: 20, move: [2, 0, 0] },
      {
        arc: 90,
        plane: 180,
        beats: 7,
        scale: 12,
        depth: 4,
        adjust: 30,
        move: [3, 0, 0],
      },
      { arc: 45, beats: 11, scale: 14, depth: 6, adjust: 40, move: [4, 0, 0] },
    ]
    const original = compileFrames(frames)
    expect(animationRangeEndpointsAlign(original, 1, 3)).toBe(true)

    const shiftedRange = shiftAnimationFrameRange(frames, original, 1, 3, {
      preserveFinalOutgoing: true,
    })
    expect(shiftedRange).toBeDefined()

    const resultFrames = structuredClone(frames)
    resultFrames.splice(1, 3, ...shiftedRange!)
    const result = compileFrames(resultFrames)

    expectVectorClose(result[1]!.pos, original[2]!.pos)
    expectVectorClose(result[1]!.rot, original[2]!.rot)
    expectVectorClose(result[2]!.pos, original[3]!.pos)
    expectVectorClose(result[2]!.rot, original[3]!.rot)
    expectVectorClose(result[3]!.pos, original[2]!.pos)
    expectVectorClose(result[3]!.rot, original[2]!.rot)
    expect(result[3]).toMatchObject({
      beats: original[3]!.beats,
      scale: original[3]!.scale,
      depth: original[3]!.depth,
      adjust: original[3]!.adjust,
    })

    expect(resultFrames[0]).toEqual(frames[0])
    expect(resultFrames[4]).toEqual(frames[4])
  })
})
