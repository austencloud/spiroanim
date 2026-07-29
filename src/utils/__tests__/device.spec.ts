import { describe, expect, it } from 'vitest'

import { isTouchDevice } from '@/utils/device'

describe('device detection', () => {
  it('detects mobile user agents and iPads using a desktop user agent', () => {
    expect(isTouchDevice({ userAgent: 'Android', maxTouchPoints: 1 })).toBe(true)
    expect(isTouchDevice({ userAgent: 'Macintosh', maxTouchPoints: 5 })).toBe(true)
  })

  it('does not classify an ordinary desktop browser as a touch device', () => {
    expect(isTouchDevice({ userAgent: 'Desktop Browser', maxTouchPoints: 0 })).toBe(false)
  })
})
