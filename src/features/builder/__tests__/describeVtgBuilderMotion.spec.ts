import { describe, expect, it, vi } from 'vitest'

import {
  areVtgBuilderMotionsEqual,
  areVtgBuilderSpinsEqual,
  describeVtgBuilderMotion,
  describeVtgBuilderMotionLabel,
  getCompiledVtgBuilderMotion,
  getVtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgCellReference } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'

const describeCell = (reference: VtgCellReference) => {
  const animation = createDefaultVtgAnimation({ reference, speedRatio: '1:3' })
  if (!animation) throw new Error(`Missing VTG animation for ${reference}`)
  return describeVtgBuilderMotion(animation)
}

describe('describeVtgBuilderMotion', () => {
  it('expands the compact motion code into a Builder tooltip', () => {
    expect(describeVtgBuilderMotionLabel('AI / SO')).toBe(
      'Spin: Anti / In\nDirection: Same / Opposite',
    )
    expect(describeVtgBuilderMotionLabel('AA / OS')).toBe(
      'Spin: Anti / Anti\nDirection: Opposite / Same',
    )
    expect(describeVtgBuilderMotionLabel('XX / XX')).toBe('Builder motion classification error.')
  })

  it('warns and returns an obvious label when motion classification fails', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Missing VTG animation')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(describeVtgBuilderMotion({ ...animation, props: [] })).toBe('XX / XX')
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })

  it('uses signed hand and prop rotation amounts to distinguish Anti from In-Spin', () => {
    expect(describeCell('1-1')).toBe('AA / SS')
    expect(describeCell('3-1')).toBe('II / SS')
    expect(describeCell('5-1')).toBe('IA / SO')
  })

  it('exposes the compiled motion independently from its display label', () => {
    const animation = createDefaultVtgAnimation({ reference: '5-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Missing VTG animation for 5-1')
    const motion = getVtgBuilderMotion(animation)

    expect(motion).toEqual({ spins: ['I', 'A'], directions: ['S', 'O'] })
    expect(areVtgBuilderMotionsEqual(motion, getVtgBuilderMotion(animation))).toBe(true)
    expect(getCompiledVtgBuilderMotion(rootCompile(animation), 1)).toEqual(motion)
    expect(
      areVtgBuilderMotionsEqual(motion, {
        spins: ['A', 'A'],
        directions: ['S', 'O'],
      }),
    ).toBe(false)
    expect(
      areVtgBuilderSpinsEqual(motion, {
        spins: ['I', 'A'],
        directions: ['O', 'S'],
      }),
    ).toBe(true)
  })
})
