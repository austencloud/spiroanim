import { describe, expect, it } from 'vitest'

import {
  applyVtgFoldSettings,
  detectVtgFoldSimpleSettings,
  deriveVtgFoldSimpleSources,
  extractVtgFoldValues,
} from '@/features/vtg/applyVtgFoldSettings'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'

describe('applyVtgFoldSettings', () => {
  it('applies Yaw and Rotate by side and beat', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [
      { 0: { yaw: 45, rotate: 90 }, 0.5: { yaw: -45 } },
      { 0.5: { rotate: -90 } },
    ])

    expect(applied.props[0]?.anim[0]).toMatchObject({ yaw: 45, rotate: 90 })
    expect(applied.props[0]?.anim[1]?.yaw).toBe(-45)
    expect(applied.props[1]?.anim[1]?.rotate).toBe(-90)
  })

  it('repeats from the selected phase and alternates sides', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(
      animation,
      [{ 0.5: { rotate: 90 } }, { 0.5: { rotate: -90 } }],
      {
        mode: 'simple',
        beat: [0.5, 0.5],
        repeat: [true, true],
        every: [1, 1],
        alternate: [true, true],
        span: 'eighth',
        mirror: false,
      },
    )

    expect(applied.props[0]?.anim[1]?.rotate).toBe(90)
    expect(applied.props[0]?.anim[3]?.rotate).toBe(-90)
    expect(applied.props[0]?.anim[5]?.rotate).toBe(90)
  })

  it('spreads Quarter Rotate across the selected and preceding frames', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 1: { yaw: 45, rotate: 180 } }, {}], {
      mode: 'simple',
      beat: [1, 1],
      repeat: [false, false],
      every: [1, 1],
      alternate: [false, false],
      span: 'quarter',
      mirror: false,
    })

    expect(applied.props[0]?.anim[1]).toMatchObject({ yaw: 45, rotate: 90 })
    expect(applied.props[0]?.anim[2]).toMatchObject({ yaw: 45, rotate: 90 })
  })

  it('supports half-beat Start and Every values for Quarter folds', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 1.5: { rotate: 180 } }, {}], {
      mode: 'simple',
      beat: [1.5, 1.5],
      repeat: [true, true],
      every: [0.5, 0.5],
      alternate: [false, false],
      span: 'quarter',
      mirror: false,
    })

    expect(applied.props[0]?.anim[2]?.rotate).toBe(90)
    expect(applied.props[0]?.anim[3]?.rotate).toBe(90)
    expect(applied.props[0]?.anim[4]?.rotate).toBe(90)
  })

  it('applies independent repetition schedules to the left and right props', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 1: { yaw: 45 } }, { 2: { yaw: -45 } }], {
      mode: 'simple',
      beat: [1, 2],
      repeat: [true, true],
      every: [1, 2],
      alternate: [false, false],
      span: 'eighth',
      mirror: false,
    })

    expect(applied.props[0]?.anim[2]?.yaw).toBe(45)
    expect(applied.props[0]?.anim[4]?.yaw).toBe(45)
    expect(applied.props[1]?.anim[2]?.yaw).toBeUndefined()
    expect(applied.props[1]?.anim[4]?.yaw).toBe(-45)
  })

  it('round-trips materialized Quarter values without repeatedly halving Rotate', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const options = {
      mode: 'simple' as const,
      beat: [2, 2] as [number, number],
      repeat: [true, true] as [boolean, boolean],
      every: [2, 2] as [number, number],
      alternate: [false, false] as [boolean, boolean],
      span: 'quarter' as const,
      mirror: false,
    }
    const first = applyVtgFoldSettings(animation, [{ 2: { rotate: 180 } }, {}], options)
    const materialized = extractVtgFoldValues(first)
    const sources = deriveVtgFoldSimpleSources(materialized, options.beat, options.span, true)
    const second = applyVtgFoldSettings(animation, sources, options)

    expect(extractVtgFoldValues(second)).toEqual(materialized)
    expect(sources[0]?.['2']?.rotate).toBe(180)
  })

  it('detects a Simple schedule only when it exactly represents the pattern values', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const simple = applyVtgFoldSettings(
      animation,
      [{ 0.5: { rotate: 90 } }, { 0.5: { rotate: -90 } }],
      {
        mode: 'simple',
        beat: [0.5, 0.5],
        repeat: [true, true],
        every: [1, 1],
        alternate: [true, true],
        span: 'eighth',
        mirror: false,
      },
    )

    expect(detectVtgFoldSimpleSettings(simple)).toMatchObject({
      beat: [0.5, 0.5],
      repeat: [true, true],
      every: [1, 1],
      alternate: [true, true],
      span: 'eighth',
      mirror: false,
    })

    const irregular = applyVtgFoldSettings(animation, [
      { 0.5: { rotate: 90 }, 1.5: { rotate: 180 }, 3: { yaw: -90 } },
      {},
    ])
    expect(detectVtgFoldSimpleSettings(irregular)).toBeUndefined()
  })

  it('mirrors only Direct and uses that mirrored Direct as the Alternate pair', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 0.5: { yaw: 90, rotate: 180 } }, {}], {
      mode: 'simple',
      beat: [0.5, 0.5],
      repeat: [true, true],
      every: [1, 1],
      alternate: [true, true],
      span: 'eighth',
      mirror: true,
    })

    expect(applied.props[0]?.anim[1]).toMatchObject({ yaw: 90, rotate: 180 })
    expect(applied.props[1]?.anim[1]).toMatchObject({ yaw: -90, rotate: 180 })
    expect(applied.props[0]?.anim[3]).toMatchObject({ yaw: -90, rotate: 180 })
    expect(applied.props[1]?.anim[3]).toMatchObject({ yaw: 90, rotate: 180 })
    expect(detectVtgFoldSimpleSettings(applied)).toMatchObject({
      mirror: true,
      beat: [0.5, 0.5],
      alternate: [true, true],
    })
  })

  it('mirrors both Direct and Rotate while repeating without Alternate', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 0.5: { yaw: 90, rotate: 180 } }, {}], {
      mode: 'simple',
      beat: [0.5, 0.5],
      repeat: [true, true],
      every: [1, 1],
      alternate: [false, false],
      span: 'eighth',
      mirror: true,
    })

    expect(applied.props[0]?.anim[1]).toMatchObject({ yaw: 90, rotate: 180 })
    expect(applied.props[1]?.anim[1]).toMatchObject({ yaw: -90, rotate: -180 })
    expect(applied.props[0]?.anim[3]).toMatchObject({ yaw: 90, rotate: 180 })
    expect(applied.props[1]?.anim[3]).toMatchObject({ yaw: -90, rotate: -180 })
  })

  it('ignores Alternate unless mirrored repetition is enabled', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{ 0.5: { yaw: 90, rotate: 180 } }, {}], {
      mode: 'simple',
      beat: [0.5, 0.5],
      repeat: [false, false],
      every: [1, 1],
      alternate: [true, true],
      span: 'eighth',
      mirror: true,
    })

    expect(applied.props[0]?.anim[1]).toMatchObject({ yaw: 90, rotate: 180 })
    expect(applied.props[1]?.anim[1]).toMatchObject({ yaw: -90, rotate: -180 })
  })

  it('mirrors the inherited Direct default when Left has no authored Fold value', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const applied = applyVtgFoldSettings(animation, [{}, {}], {
      mode: 'simple',
      beat: [2, 2],
      repeat: [false, false],
      every: [2, 2],
      alternate: [false, false],
      span: 'eighth',
      mirror: true,
    })

    expect(applied.props[0]?.anim[4]?.yaw).toBe(90)
    expect(applied.props[1]?.anim[4]?.yaw).toBe(-90)
  })
})
