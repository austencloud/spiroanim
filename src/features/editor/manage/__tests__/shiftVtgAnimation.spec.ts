import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  animationEndpointsAlign,
  shiftAnimationFrames,
} from '@/features/editor/manage/shiftAnimationFrames'
import { rootCompile } from '@/math/animation/AnimFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'

const expectVectorClose = (actual: readonly number[], expected: readonly number[]) => {
  actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(expected[axis]!, 9))
}

describe('VTG animation shifting', () => {
  it('preserves both props and their segment axes through query serialization', async () => {
    const animation = createDefaultVtgAnimation({
      reference: '4-3',
      speedRatio: '1:3',
    })
    if (!animation) throw new Error('Expected the VTG animation to be defined')

    const original = rootCompile(animation)
    for (const [propIndex, prop] of animation.props.entries()) {
      const shifted = shiftAnimationFrames(prop.anim, original.props[propIndex]!.anim)
      if (!shifted) throw new Error(`Expected prop ${propIndex} to form a closed loop`)
      prop.anim = shifted
    }

    const shifted = rootCompile(animation)
    for (const [propIndex, prop] of shifted.props.entries()) {
      const originalFrames = original.props[propIndex]!.anim
      expect(animationEndpointsAlign(prop.anim)).toBe(true)

      for (const [frameIndex, frame] of prop.anim.slice(1).entries()) {
        const originalIndex = frameIndex + 2 < originalFrames.length ? frameIndex + 2 : 1
        const expected = originalFrames[originalIndex]!
        expectVectorClose(frame.pos, expected.pos)
        expectVectorClose(frame.rot, expected.rot)
        expectVectorClose(frame.posx, expected.posx)
        expectVectorClose(frame.rotx, expected.rotx)
      }
    }

    const codec = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const encoded = codec.encodeQS(animation, false)
    expect(encoded.p0?.length).toBeLessThan(50)
    expect(encoded.p1?.length).toBeLessThan(50)

    const roundTripped = rootCompile(await codec.decodeVer(encoded))
    for (const [propIndex, prop] of roundTripped.props.entries()) {
      for (const [frameIndex, frame] of prop.anim.entries()) {
        const expected = shifted.props[propIndex]!.anim[frameIndex]!
        expectVectorClose(frame.pos, expected.pos)
        expectVectorClose(frame.rot, expected.rot)
        expectVectorClose(frame.posx, expected.posx)
        expectVectorClose(frame.rotx, expected.rotx)
      }
    }
  })
})
