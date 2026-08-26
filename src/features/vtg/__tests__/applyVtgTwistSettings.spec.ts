import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  applyVtgTwistSettings,
  detectVtgTwistMode,
  extractVtgTwistValues,
} from '@/features/vtg/applyVtgTwistSettings'
import type { VtgTwistValues } from '@/features/concepts/stores/useConceptsStore'

describe('applyVtgTwistSettings', () => {
  it('applies only beat 0.5 in Simple without changing remembered settings', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const values: VtgTwistValues = [{ 0.5: 45, 1: 90, 2.5: 135 }, { 0.5: -45 }]

    const applied = applyVtgTwistSettings(animation, 'simple', values)
    expect(applied.props[0]?.anim.slice(0, 4).map((frame) => frame.twist)).toEqual([
      undefined,
      45,
      undefined,
      undefined,
    ])
    expect(applied.props[1]?.anim[1]?.twist).toBe(-45)
    expect(values[0]).toEqual({ 0.5: 45, 1: 90, 2.5: 135 })
  })

  it('applies every available stored beat in Advanced', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgTwistSettings(animation, 'advanced', [
      { 0: 45, 0.5: 90, 1: 135, 1.5: 180 },
      {},
    ])

    expect(applied.props[0]?.anim.slice(0, 4).map((frame) => frame.twist)).toEqual([
      45, 90, 135, 180,
    ])
  })

  it('derives values and selects Advanced when Twist exists outside beat 0.5', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')

    const simpleValues = extractVtgTwistValues(
      applyVtgTwistSettings(animation, 'advanced', [{ 0.5: 90 }, { 0.5: -90 }]),
    )
    expect(detectVtgTwistMode(simpleValues)).toBe('simple')

    const advancedValues = extractVtgTwistValues(
      applyVtgTwistSettings(animation, 'advanced', [{ 0.5: 90, 2: 180 }, {}]),
    )
    expect(advancedValues).toEqual([{ 0.5: 90, 2: 180 }, {}])
    expect(detectVtgTwistMode(advancedValues)).toBe('advanced')
  })
})
