import { describe, expect, it } from 'vitest'

import { applyVtgBuilderScaleSettings } from '@/features/builder/applyVtgBuilderScaleSettings'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'

const createAnimation = () => {
  const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
  if (!animation) throw new Error('Expected a supported VTG animation')
  return animation
}

describe('applyVtgBuilderScaleSettings', () => {
  it('keeps Simple on the first editable frame and preserves its context frame', () => {
    const animation = createAnimation()
    animation.props[0]!.anim[0] = { ...animation.props[0]!.anim[0], scale: 7 }
    animation.props[0]!.anim[2] = { ...animation.props[0]!.anim[2], scale: 13 }

    const updated = applyVtgBuilderScaleSettings(animation, 'simple', [{ 0.5: 0.8, 1: 1.2 }, {}], {
      firstEditableFrameIndex: 1,
    })

    expect(updated.props[0]?.anim[0]?.scale).toBe(7)
    expect(updated.props[0]?.anim[1]?.scale).toBe(8)
    expect(updated.props[0]?.anim[2]?.scale).toBeUndefined()
    expect(animation.props[0]?.anim[2]?.scale).toBe(13)
  })

  it('applies and clears independent Advanced values at every frame', () => {
    const animation = createAnimation()
    animation.props[0]!.anim[3] = { ...animation.props[0]!.anim[3], scale: 13 }

    const updated = applyVtgBuilderScaleSettings(animation, 'advanced', [
      { 0: 0, 0.5: 0.8, 1.5: 1.4 },
      { 1: 1.1 },
    ])

    expect(updated.props[0]?.anim[0]?.scale).toBe(0)
    expect(updated.props[0]?.anim[1]?.scale).toBe(8)
    expect(updated.props[0]?.anim[2]?.scale).toBeUndefined()
    expect(updated.props[0]?.anim[3]?.scale).toBe(14)
    expect(updated.props[1]?.anim[2]?.scale).toBe(11)
    expect(animation.props[0]?.anim[3]?.scale).toBe(13)
  })
})
