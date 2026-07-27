import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VtgPane from '@/features/vtg/components/VtgPane.vue'

class FakeResizeObserver {
  static callback: ResizeObserverCallback | undefined
  static observed: Element[] = []

  constructor(callback: ResizeObserverCallback) {
    FakeResizeObserver.callback = callback
  }

  disconnect(): void {}

  observe(target: Element): void {
    FakeResizeObserver.observed.push(target)
  }

  unobserve(): void {}
}

describe('VtgPane', () => {
  beforeEach(() => {
    FakeResizeObserver.callback = undefined
    FakeResizeObserver.observed = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recreates the matrix, rule cards, and blank intersection previews', () => {
    const wrapper = mount(VtgPane)

    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    expect(wrapper.findAll('[data-role="vtg-rule-card"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-blank"]')).toHaveLength(9)
    expect(wrapper.findAll('[data-role="vtg-divider"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-prop"]')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--large')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--small')).toHaveLength(24)
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('SO/TS')
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('TO/TS')
  })

  it('tracks the live width and height of each blank preview', async () => {
    const wrapper = mount(VtgPane)
    const firstBlank = wrapper.get('[data-blank-index="0"]').element
    const entry = {
      target: firstBlank,
      contentRect: { width: 71.25, height: 68.5 },
    } as ResizeObserverEntry

    FakeResizeObserver.callback?.([entry], new FakeResizeObserver(() => {}))
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-width')).toBe('71.25')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-height')).toBe('68.5')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-width')).toBe('71.25')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-height')).toBe('68.5')
  })
})
