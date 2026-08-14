import { describe, expect, it } from 'vitest'

import { applyPatternPropColors } from '@/features/concepts/patternPropColors'
import {
  createDefaultVtgAnimation,
  createVtgPreviewAnimation,
} from '@/features/vtg/createVtgAnimation'

describe('applyPatternPropColors', () => {
  it('assigns tuple entries to prop slots 0 and 1', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')

    const colored = applyPatternPropColors(animation, { propColors: ['Blue', 'Magenta'] })

    expect(colored.props.map(({ color }) => color)).toEqual([2, 5])
  })

  it('applies custom colors to generated thumbnails', () => {
    const preview = createVtgPreviewAnimation({
      reference: '1-1',
      speedRatio: '1:3',
      propColors: ['Cyan', 'Yellow'],
    })

    expect(preview?.props.map(({ color }) => color)).toEqual([4, 3])
  })
})
