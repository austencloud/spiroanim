import { describe, expect, it } from 'vitest'

import {
  describeVtgBuilderMotion,
  describeVtgBuilderMotionLabel,
} from '@/features/builder/describeVtgBuilderMotion'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { VtgCellReference } from '@/features/vtg/types'

const describeCell = (reference: VtgCellReference) => {
  const animation = createDefaultVtgAnimation({ reference, speedRatio: '1:3' })
  if (!animation) throw new Error(`Missing VTG animation for ${reference}`)
  return describeVtgBuilderMotion(animation)
}

describe('describeVtgBuilderMotion', () => {
  it('expands the compact motion code into a Builder tooltip', () => {
    expect(describeVtgBuilderMotionLabel('AI/SO')).toBe(
      'Spin: Anti / In\nDirection: Same / Opposite',
    )
    expect(describeVtgBuilderMotionLabel('AA/OS')).toBe(
      'Spin: Anti / Anti\nDirection: Opposite / Same',
    )
  })

  it('uses signed hand and prop rotation amounts to distinguish Anti from In-Spin', () => {
    expect(describeCell('1-1')).toBe('AA/SS')
    expect(describeCell('3-1')).toBe('II/SS')
    expect(describeCell('5-1')).toBe('IA/SO')
  })
})
