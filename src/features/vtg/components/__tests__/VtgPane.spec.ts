import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PatternPlaybackControls from '@/features/concepts/components/PatternPlaybackControls.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import VtgPane from '@/features/vtg/components/VtgPane.vue'
import { createDefaultQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import type { QtrPatternSelection, VtgPatternSelection } from '@/features/vtg/types'
import { useQSMainStore } from '@/stores/useQSMainStore'
import type { RootDataFinal } from '@/types/AnimTypes'
import type {
  PatternMatchingClient,
  VtgPatternMatchResult,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

const mountVtgPane = async (qtrEnabled = false) => {
  const wrapper = mount(VtgPane)
  if (qtrEnabled) {
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)
  }
  return wrapper
}

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
      data = { 0: `blob:vtg-preview-${++FakeWorker.previewCount}` }
    }

    queueMicrotask(() => {
      if (message.type === 'reqimgs') FakeWorker.activePreviewRequests--
      const event = { data: { id: message.id, type: message.type, data } } as MessageEvent
      this.listeners.forEach((listener) => listener(event))
    })
  }

  terminate(): void {}
}

const reportAllBlankDimensions = (width: number, height: number) => {
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

describe('VtgPane', () => {
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

  it('recreates the matrix, rule cards, and blank intersection previews', () => {
    const wrapper = mount(VtgPane)

    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    expect(wrapper.findAll('[data-role="vtg-rule-card"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-blank"]')).toHaveLength(9)
    expect(wrapper.findAll('button')).toHaveLength(51)
    expect(wrapper.findAll('[data-role="vtg-divider"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-prop"]')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--large')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--small')).toHaveLength(24)
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('SO/TS')
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('TO/TS')
    expect(wrapper.find('[data-role="qtr-development-note"]').exists()).toBe(false)
  })

  it('switches the matrix and headers when the integrated QTR checkbox is enabled', async () => {
    const wrapper = mount(VtgPane)
    const qtr = wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]')
    const fourthBeat = wrapper.get<HTMLInputElement>('[data-role="vtg-beat-4"]')
    const transition = wrapper.get('[data-role="vtg-transition"]')

    expect(qtr.element.type).toBe('checkbox')
    expect(qtr.element.checked).toBe(false)
    expect(
      qtr.element.compareDocumentPosition(fourthBeat.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      fourthBeat.element.compareDocumentPosition(transition.element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await qtr.setValue(true)

    const matrixCells = wrapper.findAll('[data-role="vtg-tile"]')
    const headerLabels = wrapper.findAll('.vtg-rule-card__title')

    expect(matrixCells).toHaveLength(36)
    expect(matrixCells.every((cell) => /^Q[SO]\/Q[SO]$/.test(cell.text()))).toBe(true)
    expect(headerLabels).toHaveLength(12)
    expect(headerLabels.every((label) => label.text() === '')).toBe(true)
    expect(wrapper.find('[data-role="qtr-development-note"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-role="vtg-rule-card"][aria-describedby]')).toHaveLength(0)
    expect(wrapper.findAll('[data-role="vtg-divider"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-role="vtg-prop"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-sidebar"] [data-role="vtg-prop"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-column-headers"] [data-role="vtg-prop"]')).toHaveLength(
      0,
    )
    const firstSideProps = wrapper.findAll(
      '[data-role="vtg-sidebar"] [data-role="vtg-rule-card"]:first-child [data-role="vtg-prop"]',
    )
    expect(firstSideProps[0]?.classes()).toContain('vtg-rule-card__prop--vertical')
    expect(firstSideProps[1]?.classes()).toContain('vtg-rule-card__prop--horizontal')
    expect(firstSideProps[0]?.attributes('style')).toContain('inset-block-start: 4%')
    expect(firstSideProps[1]?.attributes('style')).toContain('inset-inline-start: 59%')
    expect(firstSideProps[0]?.attributes('style')).toContain(
      '--vtg-rule-prop-head-color: rgb(255,165,0)',
    )
    expect(firstSideProps[0]?.attributes('style')).toContain(
      '--vtg-rule-prop-handle-color: rgb(136,165,0)',
    )
    expect(firstSideProps[0]?.attributes('style')).toContain(
      '--vtg-rule-prop-tether-color: rgb(85,26,0)',
    )
    expect(firstSideProps[1]?.attributes('style')).toContain(
      '--vtg-rule-prop-head-color: rgb(0,255,0)',
    )
    expect(firstSideProps[1]?.attributes('style')).toContain(
      '--vtg-rule-prop-handle-color: rgb(0,136,0)',
    )
    expect(firstSideProps[1]?.attributes('style')).toContain(
      '--vtg-rule-prop-tether-color: rgb(0,85,0)',
    )

    expect(wrapper.get('[data-cell-reference="1-6"]').attributes('aria-label')).toContain('QO/QS')
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]').attributes('aria-label'),
    ).toBe('TOG SPLIT rule 5')
  })

  it('disables Qtr header tooltips and derives Quarter cell descriptions', async () => {
    vi.useFakeTimers()
    const wrapper = await mountVtgPane(true)
    const exampleCell = wrapper.get('[data-cell-reference="1-6"]')

    expect(wrapper.findAll('[data-role="vtg-rule-card"][aria-describedby]')).toHaveLength(0)
    expect(wrapper.findAll('[data-role="vtg-tile"][aria-describedby]')).toHaveLength(36)

    await exampleCell.trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Hands: Quarter / Opposite\nProps: Quarter / Same',
    )

    wrapper.unmount()
  })

  it('offers a typed Speed Ratio radio group above the board', async () => {
    const wrapper = mount(VtgPane)
    const group = wrapper.get('fieldset.vtg-speed-ratio')
    const options = group.findAll<HTMLInputElement>('input[type="radio"]')

    expect(group.get('legend').text()).toBe('Speed ratio')
    expect(group.get('legend').classes()).toContain('vtg-pane__visually-hidden')
    expect(options.map((option) => option.element.value)).toEqual(['1:1', '1:3', '1:5'])
    expect(options[1]?.element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-speed-ratio')).toBe('1:3')

    await options[2]?.setValue()

    expect(options[2]?.element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-speed-ratio')).toBe('1:5')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('maps the extracted header descriptions to both sets of rule buttons', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const sideRule = wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]')
    const columnRule = wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 5"]')

    expect(wrapper.findAll('[data-role="vtg-rule-card"][aria-describedby]')).toHaveLength(12)
    expect(sideRule.attributes('aria-describedby')).toBeTruthy()
    expect(columnRule.attributes('aria-describedby')).toBeTruthy()

    await sideRule.trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Tog Split - Hands are together but the props are facing 180 degrees apart.',
    )

    wrapper.unmount()
  })

  it('derives Hands and Props tooltips for all matrix buttons', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const exampleCell = wrapper.get('[data-cell-reference="1-6"]')

    expect(wrapper.findAll('[data-role="vtg-tile"][aria-describedby]')).toHaveLength(36)

    await exampleCell.trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Hands: Together / Opposite\nProps: Together / Same',
    )

    wrapper.unmount()
  })

  it('uses top-then-left references and highlights a selected matrix cross', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')
    const exampleCell = wrapper.get('[data-cell-reference="5-1"]')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
    expect(exampleCell.element.tagName).toBe('BUTTON')
    expect(exampleCell.attributes('data-board-column')).toBe('6')
    expect(exampleCell.attributes('data-board-row')).toBe('1')
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(0)
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]').attributes('aria-pressed'),
    ).toBe('false')
    expect(
      wrapper
        .get('[data-role="vtg-column-headers"] [aria-label$="rule 6"]')
        .attributes('aria-pressed'),
    ).toBe('false')

    await exampleCell.trigger('click')

    expect(pane.attributes('data-selected-cell')).toBe('5-1')
    expect(exampleCell.attributes('aria-pressed')).toBe('true')
    expect(exampleCell.classes()).toContain('vtg-tile--selected')
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(1)
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(11)
    expect(
      wrapper
        .get('[data-role="vtg-column-headers"] [aria-label$="rule 5"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '5-1', speedRatio: '1:3' }]])
  })

  it('aligns header selections with the opposing selected header', async () => {
    const wrapper = mount(VtgPane)

    await wrapper.get('[data-cell-reference="5-1"]').trigger('click')
    await wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 4"]').trigger('click')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('5-4')

    await wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 2"]').trigger('click')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('2-4')
  })

  it('selects a random cell along a clicked header when no cell is selected', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const wrapper = await mountVtgPane(true)

    await wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 4"]').trigger('click')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('4-4')
  })

  it('includes the selected speed ratio in each pattern request', async () => {
    const wrapper = mount(VtgPane)

    await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()
    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')

    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-6', speedRatio: '1:5' }]])
  })

  it('applies a newly selected speed ratio to the current pattern', async () => {
    const wrapper = mount(VtgPane)

    await wrapper.get('[data-cell-reference="3-4"]').trigger('click')
    await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '3-4', speedRatio: '1:3' }],
      [{ reference: '3-4', speedRatio: '1:5' }],
    ])
  })

  it('offers Swap and 180-degree checkboxes that reapply the current pattern', async () => {
    const wrapper = mount(VtgPane)
    const swap = wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]')
    const reverse = wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]')

    expect(swap.element.checked).toBe(false)
    expect(reverse.element.checked).toBe(false)
    expect(swap.element.nextElementSibling?.textContent).toBe('Swap')
    expect(reverse.attributes('aria-label')).toBe('Rotate motion plane 180 degrees')
    expect(reverse.element.nextElementSibling?.textContent).toBe('180°')
    expect(
      wrapper
        .findAll('.vtg-top-options .concept-pattern-options label span')
        .map((option) => option.text()),
    ).toEqual(['Swap', '180°'])

    await wrapper.get('[data-cell-reference="2-6"]').trigger('click')
    await swap.setValue(true)
    await reverse.setValue(true)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '2-6', speedRatio: '1:3' }],
      [{ reference: '2-6', speedRatio: '1:3', swapProps: true }],
      [{ reference: '2-6', speedRatio: '1:3', swapProps: true, reversePlane: true }],
    ])
  })

  it('provides tooltips for pattern, playback, and rendering controls', () => {
    const wrapper = mount(VtgPane)

    expect(wrapper.get('input[value="1:3"]').attributes('aria-label')).toBe(
      'Use the 1:3 speed ratio',
    )
    expect(wrapper.get('[data-role="vtg-swap"]').attributes('aria-label')).toBe(
      'Exchange the completed left and right animation tracks',
    )
    expect(wrapper.get('[data-role="vtg-reset"]').attributes('aria-describedby')).toBeTruthy()
    expect(wrapper.get('[data-role="vtg-reset"]').attributes('title')).toBeUndefined()
    expect(wrapper.get('[data-role="vtg-tilted"]').attributes('aria-label')).toBe(
      'Use the tilted pattern orientation',
    )
    expect(wrapper.get('[data-role="vtg-qtr"]').attributes('aria-label')).toBe(
      'Use Quarter Spacing relationships',
    )
    expect(wrapper.get('[data-role="vtg-beat-3"]').attributes('aria-label')).toBe('Start on beat 3')
    expect(wrapper.get('[data-role="vtg-paths"]').attributes('aria-label')).toBe(
      'Show the complete prop motion paths',
    )
    expect(wrapper.get('[data-role="vtg-left"]').attributes('aria-label')).toBe(
      'Show the left prop',
    )
    expect(wrapper.get('[data-role="vtg-shuffle"]').attributes('aria-describedby')).toBeTruthy()
    expect(wrapper.get('[data-role="vtg-shuffle"]').attributes('title')).toBeUndefined()
  })

  it('offers a Tilted checkbox that reapplies VTG and Qtr patterns', async () => {
    for (const qtrEnabled of [false, true]) {
      const quarters = qtrEnabled ? 1 : undefined
      const wrapper = await mountVtgPane(qtrEnabled)
      const tilted = wrapper.get<HTMLInputElement>('[data-role="vtg-tilted"]')

      expect(tilted.element.type).toBe('checkbox')
      expect(tilted.element.checked).toBe(false)
      expect(wrapper.get('[data-role="vtg-shape-controls"]').text()).toBe('Tilted')

      await wrapper.get('[data-cell-reference="5-1"]').trigger('click')
      await tilted.setValue(true)

      expect(wrapper.emitted('patternSelect')).toEqual([
        [
          {
            reference: '5-1',
            speedRatio: '1:3',
            ...(quarters === undefined ? {} : { quarters }),
          },
        ],
        [
          {
            reference: '5-1',
            speedRatio: '1:3',
            shape: 'box',
            ...(quarters === undefined ? {} : { quarters }),
          },
        ],
      ])
      wrapper.unmount()
    }
  })

  it('controls left and right prop visibility after Arms', async () => {
    for (const qtrEnabled of [false, true]) {
      const quarters = qtrEnabled ? 1 : undefined
      const wrapper = await mountVtgPane(qtrEnabled)
      const left = wrapper.get<HTMLInputElement>('[data-role="vtg-left"]')
      const right = wrapper.get<HTMLInputElement>('[data-role="vtg-right"]')
      const options = left.element.closest('fieldset')

      expect(left.element.checked).toBe(true)
      expect(right.element.checked).toBe(true)
      expect(
        Array.from(options?.querySelectorAll('label span') ?? []).map(
          (option) => option.textContent,
        ),
      ).toEqual(['Paths', 'Hands', 'Arms', 'Left', 'Right'])

      await wrapper.get('[data-cell-reference="5-1"]').trigger('click')
      await left.setValue(false)
      expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
        {
          reference: '5-1',
          speedRatio: '1:3',
          left: false,
          ...(quarters === undefined ? {} : { quarters }),
        },
      ])

      await right.setValue(false)
      expect(left.element.checked).toBe(true)
      expect(right.element.checked).toBe(false)
      expect(wrapper.emitted('patternSelect')?.at(-1)?.[0]).not.toHaveProperty('left')
      expect(wrapper.emitted('patternSelect')?.at(-1)?.[0]).toHaveProperty('right', false)

      await left.setValue(false)
      expect(left.element.checked).toBe(false)
      expect(right.element.checked).toBe(true)
      expect(wrapper.emitted('patternSelect')?.at(-1)?.[0]).toHaveProperty('left', false)
      expect(wrapper.emitted('patternSelect')?.at(-1)?.[0]).not.toHaveProperty('right')

      await left.setValue(true)
      expect(left.element.checked).toBe(true)
      expect(right.element.checked).toBe(true)
      expect(wrapper.emitted('patternSelect')?.at(-1)?.[0]).not.toHaveProperty('left')
      wrapper.unmount()
    }
  })

  it('offers starting-beat and reciprocal transition controls while keeping Double hidden', async () => {
    const concept = 'vtg'
    for (const qtrEnabled of [false, true]) {
      const quarters = qtrEnabled ? 1 : undefined
      const wrapper = await mountVtgPane(qtrEnabled)
      const firstBeat = wrapper.get<HTMLInputElement>(`[data-role="${concept}-beat-1"]`)
      const thirdBeat = wrapper.get<HTMLInputElement>(`[data-role="${concept}-beat-3"]`)
      const transition = wrapper.get<HTMLButtonElement>(`[data-role="${concept}-transition"]`)

      expect(firstBeat.element.checked).toBe(true)
      expect(thirdBeat.element.checked).toBe(false)
      expect(firstBeat.element.name).toBe(`${concept}-beat`)
      expect(wrapper.find(`[data-role="${concept}-double"]`).exists()).toBe(false)
      expect(transition.text()).toBe("45° Trans'")
      expect(transition.attributes('aria-pressed')).toBe('false')

      await wrapper.get('[data-cell-reference="5-1"]').trigger('click')
      const initialLabels = wrapper.findAll('[data-role="vtg-tile"]').map((tile) => tile.text())
      await thirdBeat.setValue()
      expect(wrapper.findAll('[data-role="vtg-tile"]').map((tile) => tile.text())).toEqual(
        initialLabels,
      )
      expect(wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').element.value).toBe('60')
      await transition.trigger('click')
      expect(transition.attributes('aria-pressed')).toBe('true')
      expect(wrapper.emitted('patternSelect')).toEqual([
        [
          {
            reference: '5-1',
            speedRatio: '1:3',
            ...(quarters === undefined ? {} : { quarters }),
          },
        ],
        [
          {
            reference: '5-1',
            speedRatio: '1:3',
            beat: 3,
            ...(quarters === undefined ? {} : { quarters }),
          },
        ],
        [
          {
            reference: '5-1',
            speedRatio: '1:3',
            beat: 3,
            double: true,
            transition: true,
            ...(quarters === undefined ? {} : { quarters }),
          },
        ],
      ])

      await transition.trigger('click')
      expect(transition.attributes('aria-pressed')).toBe('false')
      expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
        {
          reference: '5-1',
          speedRatio: '1:3',
          beat: 3,
          ...(quarters === undefined ? {} : { quarters }),
        },
      ])
      wrapper.unmount()
    }
  })

  it('temporarily hides the transition at 1:1 and restores its local preference', async () => {
    const concept = 'vtg'
    for (const qtrEnabled of [false, true]) {
      const quarters = qtrEnabled ? 1 : undefined
      const wrapper = await mountVtgPane(qtrEnabled)
      await wrapper.get('[data-cell-reference="5-1"]').trigger('click')
      await wrapper.get(`[data-role="${concept}-transition"]`).trigger('click')

      const oneToOne = wrapper.get<HTMLInputElement>('input[value="1:1"]')
      await oneToOne.setValue()

      expect(oneToOne.element.checked).toBe(true)
      expect(wrapper.getComponent(PatternPlaybackControls).props('transitionAvailable')).toBe(false)
      expect(wrapper.find(`[data-role="${concept}-transition"]`).exists()).toBe(false)
      expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
        {
          reference: '5-1',
          speedRatio: '1:1',
          double: true,
          ...(quarters === undefined ? {} : { quarters }),
        },
      ])

      await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()

      const restored = wrapper.get(`[data-role="${concept}-transition"]`)
      expect(restored.attributes('aria-pressed')).toBe('true')
      expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
        {
          reference: '5-1',
          speedRatio: '1:5',
          double: true,
          transition: true,
          ...(quarters === undefined ? {} : { quarters }),
        },
      ])

      wrapper.unmount()
      const remounted = await mountVtgPane(qtrEnabled)
      expect(remounted.get(`[data-role="${concept}-transition"]`).attributes('aria-pressed')).toBe(
        'false',
      )
      remounted.unmount()
    }
  })

  it('offers an experimental transition-beat selector after Right while transition is active', async () => {
    const wrapper = mount(VtgPane)
    await wrapper.get('[data-cell-reference="5-1"]').trigger('click')

    expect(wrapper.find('[data-role="vtg-transition-beats"]').exists()).toBe(false)
    await wrapper.get('[data-role="vtg-transition"]').trigger('click')

    const selector = wrapper.get<HTMLSelectElement>('[data-role="vtg-transition-beats"]')
    const right = wrapper.get<HTMLInputElement>('[data-role="vtg-right"]')
    expect(selector.element.value).toBe('3')
    expect(selector.attributes('aria-label')).toBe(
      'Choose the beat on which the 45-degree transition occurs',
    )
    expect(selector.element.closest('label')?.getAttribute('aria-describedby')).toBeTruthy()
    expect(selector.findAll('option').map((option) => option.text())).toEqual([
      '6',
      '5',
      '4',
      '3',
      '2',
    ])
    expect(
      right.element.compareDocumentPosition(selector.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await selector.setValue('4')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      {
        reference: '5-1',
        speedRatio: '1:3',
        double: true,
        transition: true,
        transitionBeats: 4,
      },
    ])

    await wrapper.get('[data-role="vtg-transition"]').trigger('click')
    expect(wrapper.find('[data-role="vtg-transition-beats"]').exists()).toBe(false)
  })

  it('hydrates a detected experimental transition timing', async () => {
    const animation = createDefaultVtgAnimation({
      reference: '5-1',
      speedRatio: '1:3',
      transition: true,
      transitionBeats: 2,
    })
    if (!animation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, { props: { animation } })
    await vi.waitFor(() => {
      expect(
        wrapper.get<HTMLSelectElement>('[data-role="vtg-transition-beats"]').element.value,
      ).toBe('2')
    })
  })

  it('uses Flip to select the alternate QTR orientation without quarter radios', async () => {
    const wrapper = await mountVtgPane(true)
    const reverse = wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]')

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-concept')).toBe('vtg')
    expect(wrapper.find('[data-role="vtg-quarters"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="vtg-quarters-2"]').exists()).toBe(false)
    expect(wrapper.findAll('.vtg-top-options .vtg-pattern-options label')).toHaveLength(2)
    expect(reverse.attributes('aria-label')).toBe('Flip QTR orientation and direction')
    expect(reverse.element.nextElementSibling?.textContent).toBe('Flip')

    await wrapper.get<HTMLInputElement>('[data-role="vtg-tilted"]').setValue(true)
    expect(reverse.attributes('aria-label')).toBe('Flip QTR direction')
    await wrapper.get<HTMLInputElement>('[data-role="vtg-tilted"]').setValue(false)

    await wrapper.get('[data-cell-reference="2-6"]').trigger('click')
    await reverse.setValue(true)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '2-6', speedRatio: '1:3', quarters: 1 }],
      [{ reference: '2-6', speedRatio: '1:3', reversePlane: true, quarters: 1 }],
    ])
  })

  it('hydrates a selected Qtr cell', async () => {
    const store = useConceptsStore()
    store.spacing = 9
    const animation = createDefaultQtrAnimation({
      reference: '3-4',
      speedRatio: '1:5',
      quarters: 1,
      spacing: 2,
    })
    if (!animation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, { props: { animation } })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
    })

    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[value="1:5"]').element.checked).toBe(true)
    expect(wrapper.find('[data-role="vtg-quarters"]').exists()).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-spacing"]').element.value).toBe('9')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('resets VTG controls while keeping and reapplying the selected pattern', async () => {
    const wrapper = mount(VtgPane)
    await wrapper.get('[data-cell-reference="5-6"]').trigger('click')
    await wrapper.get('[data-role="vtg-spin-toggle"]').trigger('click')
    await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(0.7)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]').setValue(12)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-spacing"]').setValue(12)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').setValue(90)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)
    const emissionCount = wrapper.emitted('patternSelect')?.length ?? 0
    await wrapper.get('[data-role="vtg-reset"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('5-6')
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').element.value).toBe('0.8')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]').element.value).toBe('5')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-spacing"]').element.value).toBe('1')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').element.value).toBe('60')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').element.checked).toBe(false)
    expect(wrapper.find('[data-role="vtg-quarters"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="vtg-quarters-2"]').exists()).toBe(false)
    expect(wrapper.emitted('patternSelect')).toHaveLength(emissionCount + 1)
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '5-6', speedRatio: '1:3', isAnti: false },
    ])
  })

  it('offers Scale, Thick, Spacing, and BPM sliders that reapply the current pattern', async () => {
    const wrapper = mount(VtgPane)
    const bpm = wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]')
    const scale = wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]')
    const thick = wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]')
    const spacing = wrapper.get<HTMLInputElement>('[data-role="vtg-spacing"]')
    const outputs = wrapper.findAll('fieldset.vtg-slider-controls output')

    expect(
      wrapper
        .get('.vtg-pattern-options')
        .element.compareDocumentPosition(wrapper.get('.vtg-slider-controls').element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    expect(bpm.attributes()).toMatchObject({ min: '40', max: '140', step: '1' })
    expect(scale.attributes()).toMatchObject({ min: '0.5', max: '1.4', step: '0.1' })
    expect(thick.attributes()).toMatchObject({ min: '1', max: '15', step: '1' })
    expect(spacing.attributes()).toMatchObject({ min: '0', max: '20', step: '1' })
    expect(bpm.element.value).toBe('60')
    expect(scale.element.value).toBe('0.8')
    expect(thick.element.value).toBe('5')
    expect(spacing.element.value).toBe('1')
    expect(outputs.map((output) => output.text())).toEqual(['0.8', '5', '1', '60'])

    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')
    await bpm.setValue(40)
    await scale.setValue(1.4)
    await thick.setValue(15)
    await spacing.setValue(20)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '1-6', speedRatio: '1:3' }],
      [{ reference: '1-6', speedRatio: '1:3', bpm: 40 }],
      [{ reference: '1-6', speedRatio: '1:3', bpm: 40, scale: 1.4 }],
      [{ reference: '1-6', speedRatio: '1:3', bpm: 40, scale: 1.4, thick: 15 }],
      [
        {
          reference: '1-6',
          speedRatio: '1:3',
          bpm: 40,
          scale: 1.4,
          thick: 15,
          spacing: 20,
        },
      ],
    ])
    expect(outputs.map((output) => output.text())).toEqual(['1.4', '15', '20', '40'])
  })

  it('places playback controls above rendering controls and sliders for VTG and Qtr', async () => {
    const concept = 'vtg'
    for (const qtrEnabled of [false, true]) {
      const wrapper = await mountVtgPane(qtrEnabled)
      const paths = wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]')
      const hands = wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]')
      const arms = wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]')
      const options = wrapper.get('.vtg-render-options')

      expect(paths.element.checked).toBe(true)
      expect(hands.element.checked).toBe(false)
      expect(arms.element.checked).toBe(true)
      expect(paths.element.nextElementSibling?.textContent).toBe('Paths')
      expect(hands.element.nextElementSibling?.textContent).toBe('Hands')
      expect(arms.element.nextElementSibling?.textContent).toBe('Arms')
      expect(options.classes()).toContain('vtg-pattern-options')
      const playbackControls = wrapper.get(`[data-role="${concept}-playback-controls"]`).element
      const buttonRows = wrapper.get('.concept-button-rows').element
      const tilted = wrapper.get<HTMLInputElement>('[data-role="vtg-tilted"]').element
      const qtr = wrapper.get<HTMLInputElement>(`[data-role="${concept}-qtr"]`).element
      const firstBeat = wrapper.get<HTMLInputElement>(`[data-role="${concept}-beat-1"]`).element
      expect(
        tilted.compareDocumentPosition(firstBeat) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(tilted.compareDocumentPosition(qtr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(qtr.compareDocumentPosition(firstBeat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(
        playbackControls.compareDocumentPosition(options.element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(playbackControls.parentElement).toBe(buttonRows)
      expect(options.element.parentElement).toBe(buttonRows)
      expect(
        options.element.compareDocumentPosition(wrapper.get('.vtg-slider-controls').element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()

      wrapper.unmount()
    }
  })

  it('reapplies the selected pattern when rendering checkboxes change', async () => {
    const wrapper = mount(VtgPane)
    const paths = wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]')
    const hands = wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]')
    const arms = wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]')

    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')
    await paths.setValue(false)
    await hands.setValue(true)
    await arms.setValue(false)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '1-6', speedRatio: '1:3' }],
      [{ reference: '1-6', speedRatio: '1:3', paths: false }],
      [{ reference: '1-6', speedRatio: '1:3', paths: false, hands: true }],
      [{ reference: '1-6', speedRatio: '1:3', paths: false, hands: true, arms: false }],
    ])
  })

  it('groups pointer and keyboard slider gestures into individual undo steps', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')

    const historyStore = useQSMainStore()
    const beginHistoryGroup = vi.spyOn(historyStore, 'beginHistoryGroup')
    const endHistoryGroup = vi.spyOn(historyStore, 'endHistoryGroup')
    const wrapper = mount(VtgPane, { props: { animation } })
    const scale = wrapper.get('[data-role="vtg-scale"]')
    const thick = wrapper.get('[data-role="vtg-thick"]')
    const bpm = wrapper.get('[data-role="vtg-bpm"]')

    await scale.trigger('pointerdown')
    await scale.trigger('pointerdown')
    expect(beginHistoryGroup).toHaveBeenCalledTimes(1)
    expect(beginHistoryGroup).toHaveBeenLastCalledWith(animation)
    await scale.trigger('pointerup')

    await thick.trigger('pointerdown')
    await thick.trigger('pointercancel')

    await bpm.trigger('keydown')
    await bpm.trigger('keydown')
    await bpm.trigger('keyup')

    await bpm.trigger('keydown')
    await bpm.trigger('blur')

    expect(beginHistoryGroup).toHaveBeenCalledTimes(4)
    expect(endHistoryGroup).toHaveBeenCalledTimes(4)
  })

  it('restores a mobile slider when a touch gesture becomes page scrolling', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android')
    const wrapper = mount(VtgPane)
    const scale = wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]')

    expect(wrapper.get('.concept-slider-controls').classes()).toContain(
      'concept-slider-controls--touch',
    )

    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')
    await scale.trigger('pointerdown', { pointerId: 7, pointerType: 'touch' })
    await scale.setValue(1.2)
    await scale.trigger('pointercancel', { pointerId: 7, pointerType: 'touch' })

    expect(scale.element.value).toBe('0.8')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '1-6', speedRatio: '1:3' },
    ])
  })

  it('hydrates every VTG control from a supported animation without selecting it again', async () => {
    const wrapper = mount(VtgPane)
    const animation = createDefaultVtgAnimation({
      reference: '5-6',
      speedRatio: '1:3',
      isAnti: true,
      swapProps: true,
      reversePlane: true,
      bpm: 87,
      scale: 0.6,
      thick: 12,
      paths: false,
      hands: true,
      arms: false,
    })
    if (!animation) throw new Error('Expected a supported VTG animation')

    await wrapper.setProps({ animation })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('5-6')
    })

    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').element.value).toBe('87')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').element.value).toBe('0.6')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]').element.value).toBe('12')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').element.checked).toBe(false)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('ignores a stale match after a newer animation has been hydrated', async () => {
    const firstAnimation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    const secondAnimation = createDefaultVtgAnimation({ reference: '3-4', speedRatio: '1:5' })
    if (!firstAnimation || !secondAnimation) throw new Error('Expected supported VTG animations')

    const first = createDeferred<VtgPatternMatchResult>()
    const second = createDeferred<VtgPatternMatchResult>()
    const matchVtg = vi
      .fn<PatternMatchingClient['matchVtg']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const patternMatcher: PatternMatchingClient = {
      matchVtg,
      matchEightStep: async () => ({ status: 'unmatched' }),
      matchQst: async () => ({ status: 'unmatched' }),
    }
    const wrapper = mount(VtgPane, {
      props: { animation: firstAnimation, patternMatcher },
    })
    await vi.waitFor(() => expect(matchVtg).toHaveBeenCalledOnce())

    await wrapper.setProps({ animation: secondAnimation })
    await vi.waitFor(() => expect(matchVtg).toHaveBeenCalledTimes(2))

    second.resolve({
      status: 'matched',
      source: 'vtg',
      match: {
        reference: '3-4',
        speedRatio: '1:5',
        isAnti: false,
        swapProps: false,
        reversePlane: false,
        bpm: 60,
        scale: 0.8,
      },
    })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
    })

    first.resolve({
      status: 'matched',
      source: 'vtg',
      match: {
        reference: '1-1',
        speedRatio: '1:3',
        isAnti: false,
        swapProps: false,
        reversePlane: false,
        bpm: 60,
        scale: 0.8,
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
  })

  it('hydrates equivalent 2-2 Trans patterns without changing Swap for a lower beat', async () => {
    const store = useConceptsStore()

    for (const example of [
      { authoredBeat: 3, authoredSwap: false },
      { authoredBeat: 4, authoredSwap: true },
    ] as const) {
      store.swapProps = example.authoredSwap
      store.reversePlane = false
      const animation = createDefaultVtgAnimation({
        reference: '2-2',
        speedRatio: '1:3',
        beat: example.authoredBeat,
        swapProps: example.authoredSwap,
        transition: true,
        transitionBeats: 5,
      })
      if (!animation) throw new Error('Expected a supported VTG animation')

      const wrapper = mount(VtgPane, { props: { animation } })
      await vi.waitFor(() => {
        expect(
          wrapper.get<HTMLInputElement>(`[data-role="vtg-beat-${example.authoredBeat}"]`).element
            .checked,
        ).toBe(true)
        expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(
          example.authoredSwap,
        )
      })

      expect(wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').element.checked).toBe(false)
      expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(
        example.authoredSwap,
      )
      expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(false)
      expect(wrapper.get('[data-role="vtg-transition"]').attributes('aria-pressed')).toBe('true')
      wrapper.unmount()
    }
  })

  it('selects a random 1:3 pattern when the loaded animation is empty', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const populatedAnimation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!populatedAnimation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, {
      props: {
        animation: {
          ...populatedAnimation,
          props: [],
        },
      },
    })
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('1-1')
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-1', speedRatio: '1:3' }]])
  })

  it('keeps option updates enabled when the initial selection immediately feeds back', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const populatedAnimation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!populatedAnimation) throw new Error('Expected a supported VTG animation')

    const animation = ref<RootDataFinal>({ ...populatedAnimation, props: [] })
    const applyPattern = vi.fn<(selection: VtgPatternSelection | QtrPatternSelection) => void>(
      (selection) => {
        const nextAnimation = createDefaultVtgAnimation(selection)
        if (nextAnimation) animation.value = nextAnimation
      },
    )
    const Host = defineComponent({
      components: { VtgPane },
      setup: () => ({ animation, applyPattern }),
      template: '<VtgPane :animation="animation" @pattern-select="applyPattern" />',
    })
    const wrapper = mount(Host)

    await vi.waitFor(() => expect(applyPattern).toHaveBeenCalledOnce())
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)

    expect(applyPattern).toHaveBeenCalledTimes(2)
    expect(applyPattern.mock.calls[1]?.[0]).toMatchObject({
      reference: '1-1',
      quarters: 1,
    })
  })

  it('waits for shared animation data before deciding whether to select a random pattern', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const loadedAnimation = createDefaultVtgAnimation({
      reference: '3-4',
      speedRatio: '1:5',
    })
    if (!loadedAnimation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, {
      props: {
        animation: {
          ...loadedAnimation,
          props: [],
        },
        animationReady: false,
      },
    })
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBeUndefined()
    expect(wrapper.emitted('patternSelect')).toBeUndefined()

    await wrapper.setProps({ animation: loadedAnimation })
    await wrapper.setProps({ animationReady: true })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
    })

    expect(wrapper.get<HTMLInputElement>('input[value="1:5"]').element.checked).toBe(true)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('does not select another random pattern when animation data is cleared after load', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const loadedAnimation = createDefaultVtgAnimation({
      reference: '3-4',
      speedRatio: '1:5',
    })
    if (!loadedAnimation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, { props: { animation: loadedAnimation } })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
    })

    await wrapper.setProps({
      animation: {
        ...loadedAnimation,
        props: [],
      },
    })
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('preserves a locally selected no-op transform when the player applies it', async () => {
    const initialAnimation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:1',
    })
    if (!initialAnimation) throw new Error('Expected a supported VTG animation')

    const wrapper = mount(VtgPane, { props: { animation: initialAnimation } })
    await vi.waitFor(() => {
      expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('1-1')
    })

    const swap = wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]')
    await swap.setValue(true)

    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '1-1', speedRatio: '1:1', swapProps: true },
    ])
    const appliedAnimation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:1',
      swapProps: true,
    })
    if (!appliedAnimation) throw new Error('Expected the emitted VTG animation')

    await wrapper.setProps({ animation: appliedAnimation })
    await nextTick()

    expect(swap.element.checked).toBe(true)
  })

  it('shares the Spin and Anti choice across the four special cells', async () => {
    const wrapper = mount(VtgPane)
    const firstSpecialCell = wrapper.get('[data-cell-reference="5-6"]')

    expect(wrapper.find('[data-role="vtg-spin-toggle"]').exists()).toBe(false)

    await firstSpecialCell.trigger('click')

    const toggle = wrapper.get('[data-role="vtg-spin-toggle"]')
    expect(toggle.text()).toBe('Spin')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.classes()).toContain('vtg-tile__spin-toggle--bottom')
    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '5-6', speedRatio: '1:3', isAnti: false }],
    ])

    await toggle.trigger('click')

    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '5-6', speedRatio: '1:3', isAnti: true },
    ])

    await wrapper.get('[data-cell-reference="6-5"]').trigger('click')

    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').classes()).not.toContain(
      'vtg-tile__spin-toggle--bottom',
    )
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '6-5', speedRatio: '1:3', isAnti: true },
    ])

    await wrapper.get('[data-cell-reference="6-5"]').trigger('click')

    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Spin')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { reference: '6-5', speedRatio: '1:3', isAnti: false },
    ])
  })

  it('does not preview row or column selections on hover', async () => {
    const wrapper = mount(VtgPane)
    const hoveredCell = wrapper.get('[data-cell-reference="6-6"]')

    await hoveredCell.trigger('mouseenter')

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBeUndefined()
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(0)
  })

  it('selects a random matrix cell from the top-left button', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(VtgPane)

    await wrapper.get('.vtg-shuffle').trigger('click')

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('1-1')
    expect(wrapper.get('[data-cell-reference="1-1"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-1', speedRatio: '1:3' }]])
  })

  it('aligns a second header click with the cell selected by the first header', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')

    await wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 6"]').trigger('click')
    await wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 1"]').trigger('click')

    expect(pane.attributes('data-selected-cell')).toBe('1-6')
  })

  it('clusters TOG SPLIT props before its moved divider', () => {
    const wrapper = mount(VtgPane)
    const propElements = wrapper
      .findAll<HTMLElement>('[data-role="vtg-prop"]')
      .map(({ element }) => element)

    expect(
      propElements.every((element) => {
        const length = element.style.blockSize || element.style.inlineSize
        return length === '37%'
      }),
    ).toBe(true)

    const columnSplitRule = wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 5"]')
    const columnSplitProps = columnSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(columnSplitProps.map(({ element }) => element.style.insetBlockStart)).toEqual([
      '4%',
      '48%',
    ])
    expect(
      columnSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetBlockStart,
    ).toBe('97%')

    const sideSplitRule = wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]')
    const sideSplitProps = sideSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(sideSplitProps.map(({ element }) => element.style.insetInlineStart)).toEqual([
      '4%',
      '48%',
    ])
    expect(
      sideSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetInlineStart,
    ).toBe('97%')
    expect(sideSplitRule.findAll('.vtg-rule-card__prop-handle')).toHaveLength(4)
  })

  it('flips left header elements without mirroring top headers', async () => {
    const wrapper = mount(VtgPane)

    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true)

    const sideSplitRule = wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]')
    const sideSplitProps = sideSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')
    expect(sideSplitRule.classes()).toContain('vtg-rule-card--reversed')
    expect(
      sideSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetInlineStart,
    ).toBe('3%')
    expect(sideSplitProps.map(({ element }) => element.style.insetInlineStart)).toEqual([
      '59%',
      '15%',
    ])
    expect(sideSplitProps[0]?.find('[data-role="vtg-prop-end"]').classes()).toContain(
      'vtg-rule-card__prop-handle--large',
    )
    expect(sideSplitProps[1]?.find('[data-role="vtg-prop-start"]').classes()).toContain(
      'vtg-rule-card__prop-handle--large',
    )

    const columnSplitRule = wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 5"]')
    const columnSplitProps = columnSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')
    expect(columnSplitRule.classes()).not.toContain('vtg-rule-card--reversed')
    expect(
      columnSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetBlockStart,
    ).toBe('97%')
    expect(columnSplitProps.map(({ element }) => element.style.insetBlockStart)).toEqual([
      '4%',
      '48%',
    ])
  })

  it('does not mirror frame-derived QTR props a second time when 180° is enabled', async () => {
    const wrapper = await mountVtgPane(true)

    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true)

    const firstSideRule = wrapper.get(
      '[data-role="vtg-sidebar"] [data-role="vtg-rule-card"]:first-child',
    )
    const firstSideProps = firstSideRule.findAll<HTMLElement>('[data-role="vtg-prop"]')
    expect(firstSideRule.classes()).toContain('vtg-rule-card--reversed')
    expect(firstSideProps[0]?.classes()).toContain('vtg-rule-card__prop--horizontal')
    expect(firstSideProps[0]?.attributes('style')).toContain('inset-inline-start: 4%')
    expect(firstSideProps[1]?.classes()).toContain('vtg-rule-card__prop--vertical')
    expect(firstSideProps[1]?.attributes('style')).toContain('inset-block-start: 59%')
  })

  it('places the top TOG IN props after the divider', () => {
    const wrapper = mount(VtgPane)
    const togInRule = wrapper.get('[data-role="vtg-column-headers"] [aria-label$="rule 3"]')
    const props = togInRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(props.map(({ element }) => element.style.insetBlockStart)).toEqual(['59%', '59%'])
    expect(props.map(({ element }) => element.style.blockSize)).toEqual(['37%', '37%'])
  })

  it('tracks the live width and height of each blank preview', async () => {
    const wrapper = mount(VtgPane)
    const firstBlank = wrapper.get('[data-blank-index="0"]').element
    const entry = {
      target: firstBlank,
      contentRect: { width: 71.25, height: 68.5 },
    } as ResizeObserverEntry

    FakeResizeObserver.callback?.([entry], new FakeResizeObserver(() => {}))
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-width')).toBe('71.25')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-height')).toBe('68.5')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-width')).toBe('71.25')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-height')).toBe('68.5')
  })

  it('renders the top-left cell for each intersection through one sequential worker queue', async () => {
    const wrapper = mount(VtgPane)
    await settlePreviewRendering()

    reportAllBlankDimensions(72, 68)
    await settlePreviewRendering()

    expect(
      wrapper
        .findAll('[data-role="vtg-preview"]')
        .map((preview) => preview.attributes('data-preview-reference')),
    ).toEqual(['1-1', '3-1', '5-1', '1-3', '3-3', '5-3', '1-5', '3-5', '5-5'])
    expect(wrapper.findAll('[data-role="vtg-preview"]')).toHaveLength(9)
    expect(countWorkerMessages('data')).toBe(9)
    expect(countWorkerMessages('reqimgs')).toBe(9)
    expect(FakeWorker.maxActivePreviewRequests).toBe(1)
    expect(
      FakeWorker.instances[0]?.messages.find(({ type }) => type === 'initialize')?.data,
    ).toEqual({ girth: 2, timeline: false })

    const renderMessages = FakeWorker.instances[0]?.messages
      .filter(({ type }) => type === 'data' || type === 'reqimgs')
      .map(({ type }) => type)
    expect(renderMessages).toEqual(Array.from({ length: 9 }, () => ['data', 'reqimgs']).flat())
  })

  it('refreshes previews for resize and non-BPM form changes', async () => {
    const wrapper = mount(VtgPane)
    await settlePreviewRendering()
    reportAllBlankDimensions(72, 68)
    await settlePreviewRendering()

    const expectNineMorePreviews = async (change: () => Promise<unknown> | void) => {
      const before = countWorkerMessages('data')
      await change()
      await settlePreviewRendering()
      expect(countWorkerMessages('data')).toBe(before + 9)
    }

    const beforeBpm = countWorkerMessages('data')
    await wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').setValue(90)
    await settlePreviewRendering()
    expect(countWorkerMessages('data')).toBe(beforeBpm)

    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('input[value="1:1"]').setValue(),
    )
    const beforeSpinChange = countWorkerMessages('data')
    await wrapper.get('[data-cell-reference="5-6"]').trigger('click')
    await wrapper.get('[data-role="vtg-spin-toggle"]').trigger('click')
    await settlePreviewRendering()
    expect(countWorkerMessages('data')).toBe(beforeSpinChange + 1)
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(1.1),
    )

    const beforeRenderingControls = countWorkerMessages('data')
    await wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').setValue(false)
    await settlePreviewRendering()
    expect(countWorkerMessages('data')).toBe(beforeRenderingControls)

    await expectNineMorePreviews(() => reportAllBlankDimensions(80, 76))
  })
})
