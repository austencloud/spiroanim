import { describe, expect, it, vi } from 'vitest'

import { reloadOnServiceWorkerControllerReplacement } from '@/services/pwaUpdate'

class TestControllerSource extends EventTarget {
  controller: object | null

  constructor(controller: object | null) {
    super()
    this.controller = controller
  }

  replaceController(controller: object | null) {
    this.controller = controller
    this.dispatchEvent(new Event('controllerchange'))
  }
}

describe('reloadOnServiceWorkerControllerReplacement', () => {
  it('reloads when an existing service-worker controller is replaced', () => {
    const source = new TestControllerSource({ version: 1 })
    const reload = vi.fn<() => void>()
    const stop = reloadOnServiceWorkerControllerReplacement(source, reload)

    source.replaceController({ version: 2 })

    expect(reload).toHaveBeenCalledOnce()

    stop()
    source.replaceController({ version: 3 })
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload when a page receives its first controller', () => {
    const source = new TestControllerSource(null)
    const reload = vi.fn<() => void>()
    const stop = reloadOnServiceWorkerControllerReplacement(source, reload)

    source.replaceController({ version: 1 })

    expect(reload).not.toHaveBeenCalled()
    stop()
  })
})
