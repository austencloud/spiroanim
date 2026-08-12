import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import QstPatternTitle from '@/features/quarter-space-tech/components/QstPatternTitle.vue'

class FakeResizeObserver {
  static callback: ResizeObserverCallback | undefined
  static observed: Element[] = []
  static disconnect = vi.fn<() => void>()

  constructor(callback: ResizeObserverCallback) {
    FakeResizeObserver.callback = callback
  }

  observe(target: Element) {
    FakeResizeObserver.observed.push(target)
  }

  disconnect() {
    FakeResizeObserver.disconnect()
  }
}

describe('QstPatternTitle', () => {
  const availableWidth = 100
  let requiredWidth = 100

  beforeEach(() => {
    FakeResizeObserver.callback = undefined
    FakeResizeObserver.observed = []
    FakeResizeObserver.disconnect.mockClear()
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => requiredWidth)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps fitting captions at their default size', () => {
    const wrapper = mount(QstPatternTitle, { props: { caption: 'Part 11 QSQS Pattern #3' } })

    expect(wrapper.get('h3').text()).toBe('Part 11 QSQS Pattern #3')
    expect(wrapper.get('h3').element.style.getPropertyValue('--qst-pattern-title-scale')).toBe('')
    expect(FakeResizeObserver.observed).toEqual([wrapper.get('h3').element])
  })

  it('shrinks overflowing captions and refits them after a resize', () => {
    requiredWidth = 200
    const wrapper = mount(QstPatternTitle, {
      props: { caption: 'Part 3: Bottom Horizontal Counter (*FRONT* Shuffle)' },
    })

    const title = wrapper.get('h3')
    expect(title.element.style.getPropertyValue('--qst-pattern-title-scale')).toBe('0.5')

    requiredWidth = 80
    FakeResizeObserver.callback?.([], {} as ResizeObserver)
    expect(title.element.style.getPropertyValue('--qst-pattern-title-scale')).toBe('')

    wrapper.unmount()
    expect(FakeResizeObserver.disconnect).toHaveBeenCalledOnce()
  })
})
