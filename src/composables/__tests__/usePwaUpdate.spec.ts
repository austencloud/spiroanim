import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePwaUpdate, type PwaUpdateController } from '@/composables/usePwaUpdate'

const workboxState = vi.hoisted(() => ({
  installOnUpdate: false,
  installing: null as object | null,
  instances: [] as EventTarget[],
  waiting: null as object | null,
}))

vi.mock('workbox-window', () => ({
  Workbox: class extends EventTarget {
    readonly messageSkipWaiting = vi.fn<() => void>()
    readonly register = vi.fn<
      () => Promise<{
        readonly installing: object | null
        readonly waiting: object | null
        update: () => Promise<void>
      }>
    >(async () => {
      return {
        get installing() {
          return workboxState.installing
        },
        get waiting() {
          return workboxState.waiting
        },
        update: vi.fn<() => Promise<void>>(async () => {
          if (workboxState.installOnUpdate) workboxState.installing = {}
        }),
      }
    })

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
    workboxState.installOnUpdate = false
    workboxState.installing = null
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
    let finishUpdateCheck: (response: Response) => void = () => undefined
    const updateCheck = new Promise<Response>((resolve) => {
      finishUpdateCheck = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(() => updateCheck),
    )
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

    await vi.waitFor(() => expect(workboxState.instances).toHaveLength(1))
    expect(controller.value?.needRefresh.value).toBe(false)

    finishUpdateCheck(new Response(null, { status: 200 }))
    await vi.waitFor(() => expect(controller.value?.needRefresh.value).toBe(true))
    expect(controller.value?.updateInstalling.value).toBe(false)
    expect(controller.value?.updateFailed.value).toBe(false)

    harness.unmount()
  })

  it('does not apply an older waiting update while a newer update installs', async () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: new TestServiceWorkerContainer(),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => new Response(null, { status: 200 })),
    )
    workboxState.waiting = { version: 1 }
    workboxState.installOnUpdate = true
    const controller = shallowRef<PwaUpdateController>()
    const harness = mount(
      defineComponent({
        setup() {
          controller.value = usePwaUpdate()
          return () => null
        },
      }),
    )

    await vi.waitFor(() => expect(workboxState.installing).not.toBeNull())
    expect(controller.value?.needRefresh.value).toBe(false)

    workboxState.installing = null
    workboxState.waiting = { version: 2 }
    workboxState.instances[0]?.dispatchEvent(
      Object.assign(new Event('waiting'), { isUpdate: true }),
    )
    expect(controller.value?.needRefresh.value).toBe(true)

    harness.unmount()
  })
})
