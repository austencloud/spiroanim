import { describe, expect, it, vi } from 'vitest'

import {
  reloadOnServiceWorkerControllerReplacement,
  scheduleServiceWorkerUpdates,
} from '@/services/pwaUpdate'

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

class TestUpdateWindow extends EventTarget {
  readonly navigator = { onLine: true }
  readonly fetch = vi.fn<() => Promise<Response>>(async () => new Response(null, { status: 200 }))
  readonly setInterval = vi.fn<(handler: TimerHandler, timeout?: number) => number>(() => 7)
  readonly clearInterval = vi.fn<(intervalId: number) => void>()
}

class TestUpdateDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible'
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

describe('scheduleServiceWorkerUpdates', () => {
  it('checks on visibility and online events while throttling repeated checks', async () => {
    const sourceWindow = new TestUpdateWindow()
    const sourceDocument = new TestUpdateDocument()
    const registration = {
      installing: null,
      update: vi.fn<() => Promise<void>>(async () => undefined),
    }
    let currentTime = 100_000
    const stop = scheduleServiceWorkerUpdates(
      registration,
      '/sw.js',
      sourceWindow,
      sourceDocument,
      {
        intervalMs: 3_600_000,
        minimumCheckIntervalMs: 60_000,
        now: () => currentTime,
      },
    )

    sourceDocument.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce())
    expect(sourceWindow.fetch).toHaveBeenCalledWith('/sw.js', { cache: 'no-store' })

    sourceWindow.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(registration.update).toHaveBeenCalledOnce()

    currentTime += 60_000
    sourceWindow.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledTimes(2))

    stop()
    currentTime += 60_000
    sourceWindow.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(registration.update).toHaveBeenCalledTimes(2)
    expect(sourceWindow.clearInterval).toHaveBeenCalledWith(7)
  })

  it('does not check while offline, hidden, or already installing', async () => {
    const sourceWindow = new TestUpdateWindow()
    const sourceDocument = new TestUpdateDocument()
    const registration = {
      installing: {},
      update: vi.fn<() => Promise<void>>(async () => undefined),
    }
    const stop = scheduleServiceWorkerUpdates(
      registration,
      '/sw.js',
      sourceWindow,
      sourceDocument,
      { minimumCheckIntervalMs: 0 },
    )

    sourceWindow.dispatchEvent(new Event('online'))
    sourceDocument.visibilityState = 'hidden'
    sourceDocument.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(sourceWindow.fetch).not.toHaveBeenCalled()
    expect(registration.update).not.toHaveBeenCalled()
    stop()
  })
})
