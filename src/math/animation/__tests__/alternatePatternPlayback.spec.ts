import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { findQtrPatternMatch } from '@/features/vtg/qtr/matchQtrAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'
import { vtgSpeedRatios } from '@/features/vtg/types'
import {
  analyzeAlternatingPatternPlayback,
  alternatePatternPlayback,
  getAlternatingPatternBase,
} from '@/math/animation/alternatePatternPlayback'
import { useBaseQS } from '@/services/query/createBaseQS'
import { CHARSET, VDEF } from '@/services/query/versions/SpiroAnimQSv5'

describe('alternatePatternPlayback', () => {
  it('transitions both props together four times by default', () => {
    const base = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      double: true,
    })
    if (!base) throw new Error('Expected doubled QTR animation')

    const animation = alternatePatternPlayback(base)
    if (!animation) throw new Error('Expected alternating animation')

    expect(animation.props.map((prop) => prop.anim.length)).toEqual([33, 33])
    expect(animation.props[0]!.anim[8]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[1]!.anim[8]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[0]!.anim[16]).toEqual({ turns: -180, plane: 180 })
    expect(animation.props[1]!.anim[16]).toEqual({ turns: -180, plane: 180 })
    expect(animation.props[0]!.anim[24]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[1]!.anim[24]).toEqual({ turns: 90, plane: 180 })
    expect(animation.props[0]!.anim[32]).toEqual({ turns: -180, plane: 180 })
    expect(animation.props[1]!.anim[32]).toEqual({ turns: -180, plane: 180 })
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

  it.each([
    { transitionBeats: 6, frameCount: 49, changeFrames: [12, 24, 36, 48] },
    { transitionBeats: 5, frameCount: 41, changeFrames: [10, 20, 30, 40] },
    { transitionBeats: 4, frameCount: 33, changeFrames: [8, 16, 24, 32] },
    { transitionBeats: 3, frameCount: 25, changeFrames: [6, 12, 18, 24] },
    { transitionBeats: 2, frameCount: 17, changeFrames: [4, 8, 12, 16] },
  ] as const)(
    'places reciprocal changes every $transitionBeats beats',
    ({ transitionBeats, frameCount, changeFrames }) => {
      const base = createDefaultQtrAnimation({
        reference: '1-1',
        speedRatio: '1:3',
        quarters: 1,
        double: true,
      })
      if (!base) throw new Error('Expected doubled QTR animation')

      const animation = alternatePatternPlayback(base, transitionBeats)
      if (!animation) throw new Error('Expected alternating animation')

      expect(animation.props.map((prop) => prop.anim.length)).toEqual([frameCount, frameCount])
      for (const frameIndex of changeFrames) {
        expect(animation.props[0]?.anim[frameIndex]).toMatchObject({ plane: 180 })
        expect(animation.props[1]?.anim[frameIndex]).toMatchObject({ plane: 180 })
      }
      expect(analyzeAlternatingPatternPlayback(animation)).toEqual({
        base,
        transitionBeats,
        transitionQuad: false,
        transitionSecond: false,
      })
    },
  )

  it('uses Quad to alternate four changes starting with the selected prop', () => {
    const base = createDefaultQtrAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      double: true,
    })
    if (!base) throw new Error('Expected doubled QTR animation')

    const animation = alternatePatternPlayback(base, 3, 1, true)
    if (!animation) throw new Error('Expected alternating animation')

    expect(animation.props[0]!.anim[6]).toEqual({})
    expect(animation.props[1]!.anim[6]).toMatchObject({ plane: 180 })
    expect(analyzeAlternatingPatternPlayback(animation)).toEqual({
      base,
      transitionBeats: 3,
      transitionQuad: true,
      transitionSecond: true,
    })
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
      transitionBeats: 5,
      transitionQuad: true,
    })
    if (!generated) throw new Error('Expected generated transition')
    expect(createVtgAnimationSignature(generated)).toBe(createVtgAnimationSignature(animation))
  })
})
