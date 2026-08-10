import { createApp, defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePatternMatchingWorker } from '@/features/concepts/composables/usePatternMatchingWorker'
import type { ConceptKey } from '@/features/concepts/types'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { PatternMatchingClient } from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

interface FakeWorkerMessage {
  id?: string
  type: 'matchVtg' | 'matchEightStep'
  data: unknown
}

class FakeWorker extends EventTarget implements Worker {
  static instances: FakeWorker[] = []

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
    queueMicrotask(() => {
      const event = new MessageEvent('message', {
        data: { id: request.id, type: request.type, data },
      })
      this.dispatchEvent(event)
      this.onmessage?.call(this, event)
    })
  }

  terminate(): void {
    this.terminated = true
  }
}

describe('usePatternMatchingWorker', () => {
  beforeEach(() => {
    FakeWorker.instances = []
    vi.stubGlobal('Worker', FakeWorker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lazily shares one worker across matching concepts and stops it elsewhere', async () => {
    const selectedConcept = ref<ConceptKey>('vtg')
    let client: PatternMatchingClient | undefined
    const app = createApp(
      defineComponent({
        setup() {
          client = usePatternMatchingWorker(selectedConcept)
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

    selectedConcept.value = '8stp'
    await nextTick()
    await expect(client.matchEightStep({ animation })).resolves.toEqual({ status: 'unmatched' })
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0]!.terminated).toBe(false)

    selectedConcept.value = 'tka'
    await nextTick()
    expect(FakeWorker.instances[0]!.terminated).toBe(true)

    selectedConcept.value = 'vtg'
    await nextTick()
    await client.matchVtg({
      animation,
      preferences: { swapProps: false, reversePlane: false, quarters: 1 },
    })
    expect(FakeWorker.instances).toHaveLength(2)

    app.unmount()
    expect(FakeWorker.instances[1]!.terminated).toBe(true)
  })
})
