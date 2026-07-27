import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { isInstalledDisplayMode, useAppDisplayMode } from '@/composables/useAppDisplayMode'

const originalStandalone = Object.getOwnPropertyDescriptor(navigator, 'standalone')
const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
const originalMaxTouchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')

function restoreNavigatorProperty(name: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(navigator, name, descriptor)
  else Reflect.deleteProperty(navigator, name)
}

function stubDisplayMode(activeMode?: string, isDesktop = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === `(display-mode: ${activeMode})` ||
        (query === '(hover: hover) and (pointer: fine)' && isDesktop),
      media: query,
      onchange: null,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      dispatchEvent: vi.fn<() => boolean>(() => true),
    })),
  )
}

function mountHarness() {
  return mount({
    setup() {
      return useAppDisplayMode()
    },
    template:
      '<div :data-desktop="isDesktop" :data-installed="isInstalledDisplay" :data-ios="isIos" />',
  })
}

describe('useAppDisplayMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    restoreNavigatorProperty('standalone', originalStandalone)
    restoreNavigatorProperty('userAgent', originalUserAgent)
    restoreNavigatorProperty('platform', originalPlatform)
    restoreNavigatorProperty('maxTouchPoints', originalMaxTouchPoints)
  })

  it('detects standards-based standalone display mode', () => {
    stubDisplayMode('standalone')

    expect(mountHarness().attributes('data-installed')).toBe('true')
    expect(isInstalledDisplayMode()).toBe(true)
  })

  it('detects a desktop-class pointer and hover capability', () => {
    stubDisplayMode(undefined, true)

    expect(mountHarness().attributes('data-desktop')).toBe('true')
  })

  it('uses the iOS navigator standalone fallback', async () => {
    stubDisplayMode()
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    const wrapper = mountHarness()
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('data-installed')).toBe('true')
  })

  it('detects an iPad requesting the desktop version of a site', async () => {
    stubDisplayMode()
    Object.defineProperties(navigator, {
      maxTouchPoints: { configurable: true, value: 5 },
      platform: { configurable: true, value: 'MacIntel' },
      userAgent: { configurable: true, value: 'Mozilla/5.0 (Mac OS X)' },
    })

    const wrapper = mountHarness()
    await wrapper.vm.$nextTick()

    expect(wrapper.attributes('data-ios')).toBe('true')
  })
})
