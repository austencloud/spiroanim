import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  inferVtgDoubledPortionSpeedRatio,
  inferVtgSpeedRatio,
} from '@/features/vtg/math/inferVtgSpeedRatio'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { getVtgBeats, getVtgTimingCycleCount, vtgSpeedRatios } from '@/features/vtg/types'
import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('inferVtgSpeedRatio', () => {
  it.each(vtgSpeedRatios)('infers %s through every half-beat starting position', (speedRatio) => {
    for (const beat of getVtgBeats(speedRatio)) {
      const selection = { reference: '5-6', speedRatio, beat, isAnti: true } as const
      const animations = [createDefaultVtgAnimation(selection)]
      if (getVtgTimingCycleCount(speedRatio) === 1) {
        animations.push(createDefaultQtrAnimation({ ...selection, quarters: 1 }))
      }
      for (const animation of animations) {
        if (!animation) throw new Error(`Missing ${speedRatio} animation`)

        expect(inferVtgSpeedRatio(animation)).toBe(speedRatio)
      }
    }
  })

  it('accepts newly supported ratios and rejects mixed continuation turns', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Missing VTG animation')

    const mixed = {
      ...animation,
      props: animation.props.map((prop, index) =>
        index === 0
          ? {
              ...prop,
              anim: prop.anim.map((frame, frameIndex) =>
                frameIndex === 1 ? { ...frame, turns: -270 } : frame,
              ),
            }
          : prop,
      ),
    }
    expect(inferVtgSpeedRatio(mixed)).toBe('1:5v3')

    mixed.props[0]!.anim[2] = { ...mixed.props[0]!.anim[2], turns: -315 }
    expect(inferVtgSpeedRatio(mixed)).toBeUndefined()
  })

  it.each(vtgSpeedRatios)('infers %s from a doubled Builder portion', (speedRatio) => {
    const animation = createDefaultVtgAnimation({ reference: '5-6', speedRatio, isAnti: true })
    if (!animation) throw new Error(`Missing ${speedRatio} animation`)

    const portion = {
      ...animation,
      props: animation.props.map((prop) => ({ ...prop, anim: prop.anim.slice(0, 2) })),
    }

    expect(inferVtgDoubledPortionSpeedRatio(portion)).toBe(speedRatio)
  })

  it.each([
    ['2:1', '1-1'],
    ['2:1', '3-1'],
    ['2:3', '1-1'],
    ['2:5', '3-1'],
    ['2:3v5', '5-1'],
    ['2:5v3', '5-1'],
    ['1:1v2:3', '5-1'],
    ['2:3v1:1', '5-1'],
  ] as const)('generates and infers generalized timing %s', (speedRatio, reference) => {
    const animation = createDefaultVtgAnimation({ reference, speedRatio })
    if (!animation) throw new Error(`Missing ${speedRatio} animation`)

    expect(inferVtgSpeedRatio(animation)).toBe(speedRatio)
  })

  it.each(['2:3', '4:1'] as const)(
    'preserves generalized timing %s through decimal Turns query quantization',
    async (speedRatio) => {
      const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio })
      if (!animation) throw new Error(`Missing ${speedRatio} animation`)
      const version = await loadSpiroAnimQSVersion(7)
      const codec = await useSpiroAnimQS(
        version.VDEF,
        useBaseQS(version.VDEF, { charset: version.CHARSET }),
        7,
      )

      const decoded = codec.decodeQS(codec.encodeQS(animation, false))

      expect(inferVtgSpeedRatio(decoded)).toBe(speedRatio)
    },
  )

  it.each(['2:1', '2:3', '2:5'] as const)(
    'preserves compound timing %s through legacy whole-degree Turns quantization',
    async (speedRatio) => {
      const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio })
      if (!animation) throw new Error(`Missing ${speedRatio} animation`)
      const version = await loadSpiroAnimQSVersion(6)
      const codec = await useSpiroAnimQS(
        version.VDEF,
        useBaseQS(version.VDEF, { charset: version.CHARSET }),
        6,
      )

      const decoded = await codec.decodeVer(codec.encodeQS(animation, false))

      expect(inferVtgSpeedRatio(decoded)).toBe(speedRatio)
    },
  )
})
