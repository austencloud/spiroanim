import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePwaUpdate, type PwaUpdateController } from '@/composables/usePwaUpdate'

const workboxState = vi.hoisted(() => ({
  instances: [] as EventTarget[],
  waiting: null as object | null,
}))

vi.mock('workbox-window', () => ({
  Workbox: class extends EventTarget {
    readonly messageSkipWaiting = vi.fn<() => void>()
    readonly register = vi.fn<
      () => Promise<{ installing: null; waiting: object | null; update: () => Promise<void> }>
    >(async () => ({
      installing: null,
      waiting: workboxState.waiting,
      update: vi.fn<() => Promise<void>>(async () => undefined),
    }))

    constructor() {
      super()
      workboxState.instances.push(this)
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
    workboxState.instances.length = 0
    workboxState.waiting = null
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
    await vi.waitFor(() => expect(workboxState.instances).toHaveLength(1))
    const workbox = workboxState.instances[0]!

    workbox.dispatchEvent(Object.assign(new Event('installing'), { isUpdate: true }))
    expect(controller.value?.updateInstalling.value).toBe(true)
    expect(controller.value?.updateFailed.value).toBe(false)

    workbox.dispatchEvent(Object.assign(new Event('redundant'), { isUpdate: true }))
    expect(controller.value?.updateInstalling.value).toBe(false)
    expect(controller.value?.updateFailed.value).toBe(true)

    harness.unmount()
  })

  it('reports an update that was already waiting when registration completes', async () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: new TestServiceWorkerContainer(),
    })
    workboxState.waiting = {}
    const controller = shallowRef<PwaUpdateController>()
    const harness = mount(
      defineComponent({
        setup() {
          controller.value = usePwaUpdate()
          return () => null
        },
      }),
    )

    await vi.waitFor(() => expect(controller.value?.needRefresh.value).toBe(true))
    expect(controller.value?.updateInstalling.value).toBe(false)
    expect(controller.value?.updateFailed.value).toBe(false)

    harness.unmount()
  })
})
