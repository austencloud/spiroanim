import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePwaUpdate, type PwaUpdateController } from '@/composables/usePwaUpdate'

const workboxInstances = vi.hoisted(() => [] as EventTarget[])

vi.mock('workbox-window', () => ({
  Workbox: class extends EventTarget {
    readonly messageSkipWaiting = vi.fn<() => void>()
    readonly register = vi.fn<() => Promise<{ installing: null; update: () => Promise<void> }>>(
      async () => ({
        installing: null,
        update: vi.fn<() => Promise<void>>(async () => undefined),
      }),
    )

    constructor() {
      super()
      workboxInstances.push(this)
    }
  },
}))

class TestServiceWorkerContainer extends EventTarget {
  controller: object | null = {}
}

describe('usePwaUpdate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    workboxInstances.length = 0
  })

  it('reports a failed update when an installing worker becomes redundant', async () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: new TestServiceWorkerContainer(),
    })
    const controller = shallowRef<PwaUpdateController>()
    const harness = mount(
      defineComponent({
        setup() {
          controller.value = usePwaUpdate()
          return () => null
        },
      }),
    )
    await vi.waitFor(() => expect(workboxInstances).toHaveLength(1))
    const workbox = workboxInstances[0]!

    workbox.dispatchEvent(Object.assign(new Event('installing'), { isUpdate: true }))
    expect(controller.value?.updateInstalling.value).toBe(true)
    expect(controller.value?.updateFailed.value).toBe(false)

    workbox.dispatchEvent(Object.assign(new Event('redundant'), { isUpdate: true }))
    expect(controller.value?.updateInstalling.value).toBe(false)
    expect(controller.value?.updateFailed.value).toBe(true)

    harness.unmount()
  })
})
