import { describe, expect, it, vi } from 'vitest'

import { loadMobileDevTools } from '@/services/mobileDevTools'

const mobileNavigator = {
  userAgent: 'Android',
  maxTouchPoints: 1,
}

describe('mobile development tools', () => {
  it('loads Eruda on mobile devices away from the production hostname', () => {
    const sourceDocument = document.implementation.createHTMLDocument()
    const init = vi.fn()
    const sourceWindow = {
      location: { hostname: 'preview.example.test' },
      navigator: mobileNavigator,
      eruda: undefined as Window['eruda'],
    }

    loadMobileDevTools(sourceWindow, sourceDocument)

    const script = sourceDocument.getElementById('spiroanim-eruda') as HTMLScriptElement
    expect(script.src).toBe('https://cdn.jsdelivr.net/npm/eruda')

    sourceWindow.eruda = { init, show: vi.fn(), hide: vi.fn() }
    script.onload?.(new Event('load'))
    expect(init).toHaveBeenCalledOnce()
  })

  it('does not load Eruda on spiroanim.com or desktop devices', () => {
    const productionDocument = document.implementation.createHTMLDocument()
    const desktopDocument = document.implementation.createHTMLDocument()

    loadMobileDevTools(
      {
        location: { hostname: 'spiroanim.com' },
        navigator: mobileNavigator,
      },
      productionDocument,
    )
    loadMobileDevTools(
      {
        location: { hostname: 'localhost' },
        navigator: { userAgent: 'Desktop', maxTouchPoints: 0 },
      },
      desktopDocument,
    )

    expect(productionDocument.scripts).toHaveLength(0)
    expect(desktopDocument.scripts).toHaveLength(0)
  })

  it('does not append a duplicate script while Eruda is loading', () => {
    const sourceDocument = document.implementation.createHTMLDocument()
    const sourceWindow = {
      location: { hostname: 'localhost' },
      navigator: mobileNavigator,
    }

    loadMobileDevTools(sourceWindow, sourceDocument)
    loadMobileDevTools(sourceWindow, sourceDocument)

    expect(sourceDocument.scripts).toHaveLength(1)
  })
})
