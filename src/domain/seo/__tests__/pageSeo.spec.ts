import { describe, expect, it } from 'vitest'

import { getPageSeo } from '@/domain/seo/pageSeo'

describe('page SEO metadata', () => {
  it('makes the prerendered public pages indexable', () => {
    expect(getPageSeo('/')).toMatchObject({
      appTitle: 'Flow Arts Concepts',
      canonicalPath: '/',
      robots: 'index, follow',
    })
    expect(getPageSeo('/index')).toEqual(getPageSeo('/'))
    expect(getPageSeo('/about')).toMatchObject({
      canonicalPath: '/about',
      appTitle: 'About - Open-Source Flow Arts Rendering',
      robots: 'index, follow',
    })
    expect(getPageSeo('/tips')).toMatchObject({
      canonicalPath: '/tips',
      appTitle: 'Tips - Keyboard Shortcuts and Timeline Controls',
      robots: 'index, follow',
    })
  })

  it('keeps application and unknown routes out of search indexes', () => {
    expect(getPageSeo('/app').robots).toBe('noindex, nofollow')
    expect(getPageSeo('/app').appTitle).toBe('Flow Arts Concepts')
    expect(getPageSeo('/missing').robots).toBe('noindex, nofollow')
  })
})
