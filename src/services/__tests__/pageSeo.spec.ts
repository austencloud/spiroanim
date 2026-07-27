import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyPageSeo } from '@/services/pageSeo'

function stubDisplayMode(installed: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: installed && query === '(display-mode: standalone)',
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

describe('applyPageSeo', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('uses the concise title in an installed display while preserving SEO metadata', () => {
    stubDisplayMode(true)

    applyPageSeo('/')

    expect(document.title).toBe('3D Flow Arts Animation')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'SpiroAnim - 3D Flow Arts Animation',
    )
  })

  it('uses the complete branded title in a browser tab', () => {
    stubDisplayMode(false)

    applyPageSeo('/')

    expect(document.title).toBe('SpiroAnim - 3D Flow Arts Animation')
  })
})
