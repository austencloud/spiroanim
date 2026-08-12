import { createApp, defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  patternMatchingClientKey,
  usePatternMatchingClient,
  usePatternMatchingWorker,
} from '@/features/concepts/composables/usePatternMatchingWorker'
import { createDefaultQstAnimation } from '@/features/quarter-space-tech/createQstAnimation'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

interface FakeWorkerMessage {
  id?: string
  type: 'matchVtg' | 'matchEightStep' | 'matchQst'
  data: unknown
}

class FakeWorker extends EventTarget implements Worker {
  static instances: FakeWorker[] = []
  static responseDelayMs = 0

  onerror: ((this: AbstractWorker, ev: ErrorEvent) => unknown) | null = null
  onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null
  onmessageerror: ((this: Worker, ev: MessageEvent) => unknown) | null = null
  readonly source: string
  terminated = false

  constructor(source: string | URL) {
    super()
    this.source = String(source)
    FakeWorker.instances.push(this)
  }

  postMessage(message: unknown, options?: StructuredSerializeOptions | Transferable[]): void {
    void options
    const request = message as FakeWorkerMessage
    if (!request.id) return

    const data = { status: 'unmatched' as const }
    const respond = () => {
      const event = new MessageEvent('message', {
        data: { id: request.id, type: request.type, data },
      })
      this.dispatchEvent(event)
      this.onmessage?.call(this, event)
    }

    if (FakeWorker.responseDelayMs > 0) {
      setTimeout(respond, FakeWorker.responseDelayMs)
    } else {
      queueMicrotask(respond)
    }
  }

  terminate(): void {
    this.terminated = true
  }
}

describe('usePatternMatchingWorker', () => {
  beforeEach(() => {
    FakeWorker.instances = []
    FakeWorker.responseDelayMs = 0
    vi.useFakeTimers()
    vi.stubGlobal('Worker', FakeWorker)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lazily shares one worker across matching methods and closes it after 30 seconds idle', async () => {
    let client: PatternMatchingClient | undefined
    const app = createApp(
      defineComponent({
        setup() {
          client = usePatternMatchingWorker()
          return () => h('div')
        },
      }),
    )
    app.mount(document.createElement('div'))

    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation || !client) throw new Error('Expected a matching client and animation')

    expect(FakeWorker.instances).toHaveLength(0)
    await expect(
      client.matchVtg({
        animation,
        preferences: { swapProps: false, reversePlane: false, quarters: 1 },
      }),
    ).resolves.toEqual({ status: 'unmatched' })

    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0]!.source).toContain('PatternMatchingWorker')

    await expect(client.matchEightStep({ animation })).resolves.toEqual({ status: 'unmatched' })
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)

    const qstAnimation = createDefaultQstAnimation({ concept: 'qst', reference: 'breaks-1' })
    if (!qstAnimation) throw new Error('Expected a QST animation')
    await expect(
      client.matchQst({
        animation: qstAnimation,
        preferences: { swapProps: false, reversePlane: false },
      }),
    ).resolves.toEqual({ status: 'unmatched' })
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)

    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    await client.matchVtg({
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    })
    expect(FakeWorker.instances).toHaveLength(2)

    app.unmount()
    expect(FakeWorker.instances[1]!.terminated).toBe(true)
  })

  it('keeps the provided worker when its Concepts consumer unmounts and remounts', async () => {
    const showConsumer = ref(true)
    const clients: PatternMatchingClient[] = []
    const Consumer = defineComponent({
      setup() {
        clients.push(usePatternMatchingClient())
        return () => h('div')
      },
    })
    const app = createApp(
      defineComponent({
        setup() {
          const client = usePatternMatchingWorker()
          provide(patternMatchingClientKey, client)
          return () => (showConsumer.value ? h(Consumer) : h('div'))
        },
      }),
    )
    app.mount(document.createElement('div'))

    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    const firstClient = clients[0]
    if (!animation || !firstClient) throw new Error('Expected a matching client and animation')
    const request = {
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    } as const

    await firstClient.matchVtg(request)
    showConsumer.value = false
    await nextTick()
    expect(FakeWorker.instances[0]!.terminated).toBe(false)

    showConsumer.value = true
    await nextTick()
    const secondClient = clients[1]
    if (!secondClient) throw new Error('Expected the remounted matching client')
    expect(secondClient).toBe(firstClient)
    await secondClient.matchVtg(request)
    expect(FakeWorker.instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    app.unmount()
  })

  it('resets the idle timeout when another request starts', async () => {
    let client: PatternMatchingClient | undefined
    const app = createApp(
      defineComponent({
        setup() {
          client = usePatternMatchingWorker()
          return () => h('div')
        },
      }),
    )
    app.mount(document.createElement('div'))

    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation || !client) throw new Error('Expected a matching client and animation')
    const request = {
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    } as const

    await client.matchVtg(request)
    await vi.advanceTimersByTimeAsync(29_000)
    await client.matchVtg(request)

    expect(FakeWorker.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    app.unmount()
  })

  it('does not close the worker while a request is pending', async () => {
    FakeWorker.responseDelayMs = 40_000
    let client: PatternMatchingClient | undefined
    const app = createApp(
      defineComponent({
        setup() {
          client = usePatternMatchingWorker()
          return () => h('div')
        },
      }),
    )
    app.mount(document.createElement('div'))

    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation || !client) throw new Error('Expected a matching client and animation')

    const result = client.matchVtg({
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)

    await vi.advanceTimersByTimeAsync(10_000)
    await expect(result).resolves.toEqual({ status: 'unmatched' })
    await vi.advanceTimersByTimeAsync(29_999)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    app.unmount()
  })
})
