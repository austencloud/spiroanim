import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EightStepPane from '@/features/eight-step/components/EightStepPane.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'

class FakeResizeObserver {
  static callback: ResizeObserverCallback | undefined
  static observed: Element[] = []

  constructor(callback: ResizeObserverCallback) {
    FakeResizeObserver.callback = callback
  }

  disconnect(): void {}

  observe(target: Element): void {
    FakeResizeObserver.observed.push(target)
  }

  unobserve(): void {}
}

interface FakeWorkerMessage {
  id?: string
  type: string
  data: unknown
}

class FakeWorker {
  static instances: FakeWorker[] = []
  static previewCount = 0
  static activePreviewRequests = 0
  static maxActivePreviewRequests = 0

  readonly messages: FakeWorkerMessage[] = []
  private readonly listeners = new Set<EventListener>()

  constructor() {
    FakeWorker.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') this.listeners.add(listener)
  }

  postMessage(message: FakeWorkerMessage): void {
    this.messages.push(message)
    if (message.id === undefined) return

    let data: unknown
    if (message.type === 'warnStr') data = message.data
    else if (message.type === 'initialize') data = true
    else if (message.type === 'reqimgs') {
      FakeWorker.activePreviewRequests++
      FakeWorker.maxActivePreviewRequests = Math.max(
        FakeWorker.maxActivePreviewRequests,
        FakeWorker.activePreviewRequests,
      )
      data = { 0: `blob:eight-step-preview-${++FakeWorker.previewCount}` }
    }

    queueMicrotask(() => {
      if (message.type === 'reqimgs') FakeWorker.activePreviewRequests--
      const event = { data: { id: message.id, type: message.type, data } } as MessageEvent
      this.listeners.forEach((listener) => listener(event))
    })
  }

  terminate(): void {}
}

const reportAllPreviewDimensions = (width: number, height: number) => {
  const entries = FakeResizeObserver.observed.map(
    (target) =>
      ({
        target,
        contentRect: { width, height },
      }) as ResizeObserverEntry,
  )
  FakeResizeObserver.callback?.(entries, {} as ResizeObserver)
}

const settlePreviewRendering = async () => {
  for (let index = 0; index < 12; index++) await flushPromises()
  await nextTick()
}

const countWorkerMessages = (type: string) =>
  FakeWorker.instances[0]?.messages.filter((message) => message.type === type).length ?? 0

describe('EightStepPane', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    FakeResizeObserver.callback = undefined
    FakeResizeObserver.observed = []
    FakeWorker.instances = []
    FakeWorker.previewCount = 0
    FakeWorker.activePreviewRequests = 0
    FakeWorker.maxActivePreviewRequests = 0
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.stubGlobal('Worker', FakeWorker)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uses shared tooltips for row relationships and cell descriptions', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EightStepPane)

    const rowHeaders = wrapper.findAll('[data-role="eight-step-row-header"]')
    const cells = wrapper.findAll('[data-role="eight-step-cell"]')
    expect(rowHeaders).toHaveLength(9)
    expect(cells).toHaveLength(72)
    expect(rowHeaders.every((header) => header.attributes('aria-describedby'))).toBe(true)
    expect(cells.every((cell) => cell.attributes('aria-describedby'))).toBe(true)

    await wrapper.get('[data-role="eight-step-row-header"][aria-label="AA"]').trigger('mouseenter')
    vi.runAllTimers()
    await nextTick()
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('Anti vs Anti')

    await wrapper.get('[data-role="eight-step-row-header"][aria-label="AA"]').trigger('mouseleave')
    await nextTick()
    await wrapper.get('[data-cell-reference="1-AA"]').trigger('mouseenter')
    vi.runAllTimers()
    await nextTick()
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Opposite\nAnti vs Anti',
    )

    wrapper.unmount()
  })

  it('renders four paired column groups, nine coded rows, and 72 blank cells', () => {
    const wrapper = mount(EightStepPane)

    const columnHeaders = wrapper.findAll('[data-role="eight-step-column-header"]')
    expect(columnHeaders.map((header) => header.text())).toEqual([
      'Opposite',
      'Same',
      'Quarter Aligned',
      'Quarter Opposed',
    ])
    expect(columnHeaders.map((header) => header.attributes('aria-label'))).toEqual([
      'Opposite, columns 1 and 2',
      'Same, columns 3 and 4',
      'Quarter Aligned, columns 5 and 6',
      'Quarter Opposed, columns 7 and 8',
    ])
    expect(
      wrapper.findAll('[data-role="eight-step-row-header"]').map((header) => header.text()),
    ).toEqual(['AA', 'AE', 'AI', 'EA', 'EE', 'EI', 'IA', 'IE', 'II'])

    const cells = wrapper.findAll('[data-role="eight-step-cell"]')
    expect(cells).toHaveLength(72)
    expect(cells.every((cell) => cell.text() === '')).toBe(true)
    expect(cells[0]?.attributes('data-cell-reference')).toBe('1-AA')
    expect(cells.at(-1)?.attributes('data-cell-reference')).toBe('8-II')

    expect(
      wrapper
        .findAll('.eight-step-cell--marked')
        .map((cell) => cell.attributes('data-cell-reference'))
        .sort(),
    ).toEqual(
      [
        '1-AE',
        '1-AI',
        '2-EE',
        '2-EI',
        '2-IE',
        '2-II',
        '3-EE',
        '3-EI',
        '3-IE',
        '3-II',
        '4-AE',
        '4-AI',
        '5-EE',
        '5-EI',
        '5-IE',
        '5-II',
        '6-EE',
        '6-EI',
        '6-IE',
        '6-II',
        '7-AE',
        '7-AI',
        '8-AE',
        '8-AI',
      ].sort(),
    )
  })

  it('renders nine row previews and reuses each result across all eight columns', async () => {
    const wrapper = mount(EightStepPane)
    await settlePreviewRendering()

    expect(FakeResizeObserver.observed).toHaveLength(9)
    expect(
      FakeResizeObserver.observed.map((element) => (element as HTMLElement).dataset.cellReference),
    ).toEqual(['1-AA', '1-AE', '1-AI', '1-EA', '1-EE', '1-EI', '1-IA', '1-IE', '1-II'])

    reportAllPreviewDimensions(72, 68)
    await settlePreviewRendering()

    const previews = wrapper.findAll('[data-role="eight-step-preview"]')
    expect(previews).toHaveLength(72)
    expect(new Set(previews.map((preview) => preview.attributes('src')))).toHaveLength(9)

    for (const row of ['AA', 'AE', 'AI', 'EA', 'EE', 'EI', 'IA', 'IE', 'II']) {
      const rowPreviews = wrapper.findAll(
        `[data-board-row="${row}"] [data-role="eight-step-preview"]`,
      )
      expect(rowPreviews).toHaveLength(8)
      expect(new Set(rowPreviews.map((preview) => preview.attributes('src')))).toHaveLength(1)
      expect(
        new Set(rowPreviews.map((preview) => preview.attributes('data-preview-reference'))),
      ).toEqual(new Set([`1-${row}`]))
    }

    expect(countWorkerMessages('data')).toBe(9)
    expect(countWorkerMessages('reqimgs')).toBe(9)
    expect(FakeWorker.maxActivePreviewRequests).toBe(1)
    expect(
      FakeWorker.instances[0]?.messages.find(({ type }) => type === 'initialize')?.data,
    ).toEqual({ girth: 2, timeline: false })
  })

  it('refreshes row previews for resize, Swap, Flip, and Scale only', async () => {
    const wrapper = mount(EightStepPane)
    await settlePreviewRendering()
    reportAllPreviewDimensions(72, 68)
    await settlePreviewRendering()

    const expectNineMorePreviews = async (change: () => Promise<unknown> | void) => {
      const before = countWorkerMessages('data')
      await change()
      await settlePreviewRendering()
      expect(countWorkerMessages('data')).toBe(before + 9)
    }

    const beforeBpm = countWorkerMessages('data')
    await wrapper.get<HTMLInputElement>('[data-role="eight-step-bpm"]').setValue(90)
    await settlePreviewRendering()
    expect(countWorkerMessages('data')).toBe(beforeBpm)

    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="eight-step-swap"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="eight-step-reverse"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="eight-step-scale"]').setValue(1.1),
    )

    const beforeRenderingControls = countWorkerMessages('data')
    await wrapper.get<HTMLInputElement>('[data-role="eight-step-paths"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="eight-step-hands"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="eight-step-arms"]').setValue(false)
    await settlePreviewRendering()
    expect(countWorkerMessages('data')).toBe(beforeRenderingControls)

    await expectNineMorePreviews(() => reportAllPreviewDimensions(80, 76))
  })

  it('places the random control in the top-left and selects from all cells', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(EightStepPane)
    const shuffle = wrapper.get('[data-role="eight-step-shuffle"]')

    expect(shuffle.attributes('aria-label')).toBe('Shuffle Eight Step patterns')
    await shuffle.trigger('click')

    expect(wrapper.get('[data-role="eight-step-pane"]').attributes('data-selected-cell')).toBe(
      '1-AA',
    )
    expect(wrapper.get('[data-cell-reference="1-AA"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('.eight-step-cell--highlighted')).toHaveLength(16)
    expect(wrapper.findAll('.eight-step-header--accent')).toHaveLength(2)
    expect(wrapper.get('[aria-label="Opposite, columns 1 and 2"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.get('[aria-label="AA"]').attributes('aria-pressed')).toBe('true')
  })

  it('highlights a paired top header and the exact selected row', async () => {
    const wrapper = mount(EightStepPane)

    expect(wrapper.get('[data-role="eight-step-board"]').attributes('style')).toContain(
      '--eight-step-first-head: rgb(0,255,0)',
    )
    expect(wrapper.get('[data-role="eight-step-board"]').attributes('style')).toContain(
      '--eight-step-first-tether: rgb(0,85,0)',
    )
    expect(wrapper.get('[data-role="eight-step-board"]').attributes('style')).toContain(
      '--eight-step-second-head: rgb(255,165,0)',
    )
    expect(wrapper.get('[data-role="eight-step-board"]').attributes('style')).toContain(
      '--eight-step-second-tether: rgb(85,26,0)',
    )

    await wrapper.get('[data-cell-reference="2-AE"]').trigger('click')

    expect(wrapper.get('[aria-label="Opposite, columns 1 and 2"]').classes()).toContain(
      'eight-step-header--accent',
    )
    expect(wrapper.get('[aria-label="AE"]').classes()).toContain('eight-step-header--accent')
    expect(wrapper.get('[aria-label="AA"]').classes()).not.toContain('eight-step-header--accent')
    expect(wrapper.findAll('.eight-step-cell--highlighted')).toHaveLength(16)

    await wrapper.get('[data-cell-reference="2-EE"]').trigger('click')
    expect(wrapper.get('[data-cell-reference="2-EE"]').classes()).toEqual(
      expect.arrayContaining(['eight-step-cell--marked', 'eight-step-cell--selected']),
    )
  })

  it('swaps both prop color roles when Swap is enabled', async () => {
    const wrapper = mount(EightStepPane)

    await wrapper.get<HTMLInputElement>('[data-role="eight-step-swap"]').setValue(true)

    const boardStyle = wrapper.get('[data-role="eight-step-board"]').attributes('style')
    expect(boardStyle).toContain('--eight-step-first-head: rgb(255,165,0)')
    expect(boardStyle).toContain('--eight-step-first-tether: rgb(85,26,0)')
    expect(boardStyle).toContain('--eight-step-second-head: rgb(0,255,0)')
    expect(boardStyle).toContain('--eight-step-second-tether: rgb(0,85,0)')
  })

  it('uses and resets the shared concept controls', async () => {
    const store = useConceptsStore()
    store.swapProps = true
    store.reversePlane = true
    store.bpm = 84
    store.scale = 1.2
    store.thick = 11
    store.paths = false
    store.hands = true
    store.arms = false
    const wrapper = mount(EightStepPane)

    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-swap"]').element.checked).toBe(
      true,
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-reverse"]').element.checked).toBe(
      true,
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-bpm"]').element.value).toBe('84')
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-scale"]').element.value).toBe(
      '1.2',
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-thick"]').element.value).toBe('11')

    await wrapper.get('[data-role="eight-step-reset"]').trigger('click')

    expect(store.swapProps).toBe(false)
    expect(store.reversePlane).toBe(false)
    expect(store.bpm).toBe(60)
    expect(store.scale).toBe(0.8)
    expect(store.thick).toBe(4)
    expect(store.paths).toBe(true)
    expect(store.hands).toBe(false)
    expect(store.arms).toBe(true)
  })

  it('emits a complete selection using the shared controls', async () => {
    const store = useConceptsStore()
    store.swapProps = true
    store.reversePlane = true
    store.bpm = 84
    store.scale = 1.2
    store.thick = 11
    store.paths = false
    store.hands = true
    store.arms = false
    const wrapper = mount(EightStepPane)

    await wrapper.get('[data-cell-reference="7-IE"]').trigger('click')

    expect(wrapper.emitted('patternSelect')).toEqual([
      [
        {
          concept: '8stp',
          reference: '7-IE',
          swapProps: true,
          reversePlane: true,
          bpm: 84,
          scale: 1.2,
          thick: 11,
          paths: false,
          hands: true,
          arms: false,
        },
      ],
    ])
  })

  it('hydrates the selected cell and controls from compiled Eight Step data', async () => {
    const animation = createDefaultEightStepAnimation({
      concept: '8stp',
      reference: '6-EI',
      swapProps: true,
      reversePlane: true,
      bpm: 93,
      scale: 1.1,
      thick: 12,
      paths: false,
      hands: true,
      arms: false,
    })
    expect(animation).toBeDefined()

    const wrapper = mount(EightStepPane, { props: { animation } })
    await flushPromises()

    expect(wrapper.get('[data-role="eight-step-pane"]').attributes('data-selected-cell')).toBe(
      '6-EI',
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-swap"]').element.checked).toBe(
      true,
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-reverse"]').element.checked).toBe(
      true,
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-bpm"]').element.value).toBe('93')
    expect(wrapper.get<HTMLInputElement>('[data-role="eight-step-scale"]').element.value).toBe(
      '1.1',
    )
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })
})
