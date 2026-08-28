import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createVtgAnimationSignature } from '@/features/vtg/math/createVtgAnimationSignature'

const createAnimation = () => {
  const animation = createDefaultVtgAnimation({ reference: '2-1', speedRatio: '1:3' })
  if (!animation) throw new Error('Expected a supported VTG animation')
  return animation
}

describe('createVtgAnimationSignature', () => {
  it('treats omitted frame angles like their compiled zero-degree defaults', () => {
    const omitted = createAnimation()
    const explicit = createAnimation()
    const frame = explicit.props[0]?.anim[2]
    if (!frame) throw new Error('Expected a continuation frame')
    frame.plane = 0
    frame.axis = 0

    expect(createVtgAnimationSignature(omitted)).toBe(createVtgAnimationSignature(explicit))
  })
})
