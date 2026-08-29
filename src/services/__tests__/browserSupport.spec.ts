import { afterEach, describe, expect, it, vi } from 'vitest'

import { isBrowserSupported } from '@/services/browserSupport'

describe('isBrowserSupported', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('accepts a browser with the required rendering features', () => {
    const canvas = document.createElement('canvas')
    canvas.transferControlToOffscreen = vi.fn<() => OffscreenCanvas>()
    vi.spyOn(canvas, 'getContext').mockReturnValue({} as WebGL2RenderingContext)

    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    vi.stubGlobal('Worker', class Worker {})
    vi.stubGlobal(
      'OffscreenCanvas',
      class OffscreenCanvas {
        convertToBlob = vi.fn<() => Promise<Blob>>()
        getContext = vi.fn<() => object>(() => ({}))
      },
    )

    expect(isBrowserSupported()).toBe(true)
  })

  it('rejects a browser without WebGL 2 support', () => {
    const canvas = document.createElement('canvas')
    canvas.transferControlToOffscreen = vi.fn<() => OffscreenCanvas>()
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)

    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    vi.stubGlobal('Worker', class Worker {})
    vi.stubGlobal(
      'OffscreenCanvas',
      class OffscreenCanvas {
        convertToBlob = vi.fn<() => Promise<Blob>>()
        getContext = vi.fn<() => object>(() => ({}))
      },
    )

    expect(isBrowserSupported()).toBe(false)
  })

  it('rejects partial OffscreenCanvas implementations without WebGL 2', () => {
    const canvas = document.createElement('canvas')
    canvas.transferControlToOffscreen = vi.fn<() => OffscreenCanvas>()
    vi.spyOn(canvas, 'getContext').mockReturnValue({} as WebGL2RenderingContext)

    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    vi.stubGlobal('Worker', class Worker {})
    vi.stubGlobal(
      'OffscreenCanvas',
      class OffscreenCanvas {
        convertToBlob = vi.fn<() => Promise<Blob>>()
        getContext = vi.fn<() => null>(() => null)
      },
    )

    expect(isBrowserSupported()).toBe(false)
  })
})
