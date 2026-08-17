import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { inferVtgSpeedRatio } from '@/features/vtg/math/inferVtgSpeedRatio'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'

describe('inferVtgSpeedRatio', () => {
  it.each(vtgSpeedRatios)('infers %s through every half-beat starting position', (speedRatio) => {
    for (const beat of vtgBeats) {
      const selection = { reference: '5-6', speedRatio, beat, isAnti: true } as const
      for (const animation of [
        createDefaultVtgAnimation(selection),
        createDefaultQtrAnimation({ ...selection, quarters: 1 }),
      ]) {
        if (!animation) throw new Error(`Missing ${speedRatio} animation`)

        expect(inferVtgSpeedRatio(animation)).toBe(speedRatio)
      }
    }
  })

  it('rejects mixed and unsupported continuation turns', () => {
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
    expect(inferVtgSpeedRatio(mixed)).toBeUndefined()

    mixed.props[0]!.anim[1] = { ...mixed.props[0]!.anim[1], turns: -315 }
    expect(inferVtgSpeedRatio(mixed)).toBeUndefined()
  })
})
