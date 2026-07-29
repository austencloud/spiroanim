import { describe, expect, it } from 'vitest'

import { getPointerClientPosition } from '@/utils/pointerEvent'

describe('getPointerClientPosition', () => {
  it('reads mouse coordinates without requiring the TouchEvent constructor', () => {
    const touchEventDescriptor = Object.getOwnPropertyDescriptor(window, 'TouchEvent')
    Reflect.deleteProperty(window, 'TouchEvent')

    try {
      expect(
        getPointerClientPosition(new MouseEvent('click', { clientX: 42, clientY: 24 })),
      ).toEqual({
        clientX: 42,
        clientY: 24,
      })
    } finally {
      if (touchEventDescriptor) {
        Object.defineProperty(window, 'TouchEvent', touchEventDescriptor)
      }
    }
  })

  it('prefers the changed touch when a touch interaction ends', () => {
    const event = new Event('touchend') as TouchEvent
    Object.defineProperties(event, {
      touches: { value: [] },
      changedTouches: { value: [{ clientX: 81, clientY: 18 }] },
    })

    expect(getPointerClientPosition(event)).toEqual({ clientX: 81, clientY: 18 })
  })
})
