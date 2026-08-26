import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  animationEndpointsAlign,
  shiftAnimationFrames,
} from '@/math/animation/shiftAnimationFrames'
import { rootCompile } from '@/math/animation/AnimFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'

const expectVectorClose = (actual: readonly number[], expected: readonly number[]) => {
  actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(expected[axis]!, 9))
}

describe('VTG animation shifting', () => {
  it('recognizes rendered closure throughout serialized Shift rotations', async () => {
    const version = await loadSpiroAnimQSVersion(11)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      11,
    )
    const shiftedQueries = [
      'r=Ew68Yk11Y&p0=QN__v.___Rhw.5L_Qpg.......&x0=_s_&r0=BG7f_...._-7f_...MX___.BG7f_&m0=_1_mxqv__&p1=NN__v.mD_Qpg.5E0.......&x1=_s_&r1=_YJf_....BG7f_...MX___._YJf_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.5L_____U0.___Qpg_U0.......&x0=_s_&r0=_-7f_.BH___.._-7f_...MX___.BG7f_&m0=_1_mxqv__&p1=NN__v.g______U0.5E0Qpg_WQ.......&x1=_s_&r1=BG7f_.MX___..BG7f_...MX___._YJf_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.bn_.5L_Qpg.......&x0=_s_&r0=BG7f_.._-7f_...MX___.BG7f_&m0=_1_mxqv__&p1=NN__v.bn_.5E0Qpg.......&x1=_s_&r1=BG7f_.MX___.BG7f_...MX___._YJf_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.g______U0.5L_Qpg._______U0......&x0=_s_&r0=_-7f_.BG7f_...MX___.BG7f_&m0=_1_mxqv__&p1=NN__v.5L_____U0._U0Qpg._______U0......&x1=_s_&r1=_-7f_.BG7f_...MX___._YJf_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.mD_Qpg.5L_.......&x0=_s_&r0=.BH___..MX___.BG7f_...._-7f_&m0=_1_mxqv__&p1=NN__v.___Rhw_U0.5E0Qpg_WQ.......&x1=_s_&r1=.BH___..MX___._YJf_....BG7f_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.mD_Qpg.5L_.......___R3s_U0&x0=_s_&r0=.BH___..MX___.BG7f_...._-7f_&m0=_1_mxqv__&p1=NN__v.___Rhw_U0.5E0Qpg_WQ.......___R3s_U0&x1=_s_&r1=.BH___..MX___._YJf_....BG7f_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.gU0.5E0Qpg......___R3s_U0.___Qpg_U0&x0=_s_&r0=BH___..MX___.BG7f_...._-7f_&m0=_1_mxqv__&p1=NN__v.5E0.___Qpg......___R3s_U0.___Qpg_U0&x1=_s_&r1=BH___..MX___._YJf_....BG7f_&c=_i_bhq&v=11',
      'r=Ew68Yk11Y&p0=QN__v.bg0____WQ.5E0Qpg_WQ.....___R3s_U0.___Qpg_U0.&x0=_s_&r0=BH___.MX___.BG7f_...._-7f_&m0=_1_mxqv__&p1=NN__v.bg0____WQ.5L_Qpg_U0.....___R3s_U0.___Qpg_U0.&x1=_s_&r1=BH___.MX___._YJf_....BG7f_&c=_i_bhq&v=11',
    ]

    for (const [shiftIndex, query] of shiftedQueries.entries()) {
      const animation = codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
      const compiled = rootCompile(animation)
      for (const [propIndex, prop] of compiled.props.entries()) {
        expect(animationEndpointsAlign(prop.anim), `shift ${shiftIndex}, prop ${propIndex}`).toBe(
          true,
        )
      }
    }
  })

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
