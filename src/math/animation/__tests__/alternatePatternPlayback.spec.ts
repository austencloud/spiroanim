import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import { vtgSpeedRatios } from '@/features/vtg/types'
import {
  alternatePatternPlayback,
  getAlternatingPatternBase,
} from '@/math/animation/alternatePatternPlayback'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import { useBaseQS } from '@/services/query/createBaseQS'
import { CHARSET, VDEF } from '@/services/query/versions/SpiroAnimQSv5'

describe('alternatePatternPlayback', () => {
  it('reproduces the alternating 1:3 QTR/VTG transition sequence', () => {
    const base = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      double: true,
    })
    if (!base) throw new Error('Expected doubled QTR animation')

    const animation = alternatePatternPlayback(base)
    if (!animation) throw new Error('Expected alternating animation')

    const cycleFrameCount = base.props[0]!.anim.length - 1
    const blockFrameCount = doublePlaybackMultiplier + cycleFrameCount
    const changeFrames = Array.from(
      { length: base.props.length * doublePlaybackMultiplier },
      (_unused, index) => base.props[0]!.anim.length + index * blockFrameCount + 1,
    )

    expect(animation.props.map((prop) => prop.anim.length)).toEqual([41, 41])
    expect(changeFrames).toEqual([10, 20, 30, 40])
    expect(animation.props[0]!.anim[10]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[1]!.anim[20]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[0]!.anim[30]).toEqual({ turns: -180, plane: 180 })
    expect(animation.props[1]!.anim[40]).toEqual({ turns: -180, plane: 180 })
    expect(animation.props[1]!.anim[10]).toEqual({})
    expect(animation.props[0]!.anim[20]).toEqual({})
  })

  it.each(vtgSpeedRatios)('derives valid alternating turns for %s', (speedRatio) => {
    const base = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio,
      quarters: 1,
      double: true,
    })
    if (!base) throw new Error(`Expected doubled ${speedRatio} QTR animation`)

    const animation = alternatePatternPlayback(base)

    expect(animation).toBeDefined()
    expect(getAlternatingPatternBase(animation!)).toEqual(base)
  })

  it('recovers no base from an ordinary doubled cycle', () => {
    const base = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      double: true,
    })
    if (!base) throw new Error('Expected doubled QTR animation')

    expect(getAlternatingPatternBase(base)).toBeUndefined()
  })

  it('matches the supplied hand-authored QTR 1-1 transition', async () => {
    const codec = await useSpiroAnimQS(VDEF, useBaseQS(VDEF, { charset: CHARSET }), 5)
    const suppliedQuery = {
      r: 'Ew09Aj11Y',
      p0: 'N__.mBE_____s.5JEs8........._ZEwm...................._ZEs8..........',
      p1: 'S__.blE_____s.5JEs8..................._ZEwm...................._U0s8',
      c: '_i_bhq~',
      v: '5',
    } as const
    const animation = codec.decodeQS(suppliedQuery)

    expect(findQtrPatternMatch(animation)).toMatchObject({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      double: true,
      transition: true,
    })

    const generated = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      transition: true,
    })
    if (!generated) throw new Error('Expected generated transition')
    expect(createVtgAnimationSignature(generated)).toBe(createVtgAnimationSignature(animation))
  })
})
