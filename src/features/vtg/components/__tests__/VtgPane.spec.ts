import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VtgPane from '@/features/vtg/components/VtgPane.vue'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'

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
    expect(wrapper.findAll('button')).toHaveLength(49)
    expect(wrapper.findAll('[data-role="vtg-divider"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-prop"]')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--large')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--small')).toHaveLength(24)
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('SO/TS')
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('TO/TS')
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
    const bottomRule = wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 5"]')

    expect(wrapper.findAll('[data-role="vtg-rule-card"][aria-describedby]')).toHaveLength(12)
    expect(sideRule.attributes('aria-describedby')).toBeTruthy()
    expect(bottomRule.attributes('aria-describedby')).toBeTruthy()

    await sideRule.trigger('mouseenter')
    vi.runAllTimers()
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
    vi.runAllTimers()
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Hands: Split / Opposite\nProps: Together / Same',
    )

    wrapper.unmount()
  })

  it('uses bottom-then-left references and highlights a selected matrix cross', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')
    const exampleCell = wrapper.get('[data-cell-reference="1-5"]')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
    expect(exampleCell.element.tagName).toBe('BUTTON')
    expect(exampleCell.attributes('data-board-column')).toBe('2')
    expect(exampleCell.attributes('data-board-row')).toBe('2')
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(0)
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]').attributes('aria-pressed'),
    ).toBe('false')
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 6"]').attributes('aria-pressed'),
    ).toBe('false')

    await exampleCell.trigger('click')

    expect(pane.attributes('data-selected-cell')).toBe('1-5')
    expect(exampleCell.attributes('aria-pressed')).toBe('true')
    expect(exampleCell.classes()).toContain('vtg-tile--selected')
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(1)
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(11)
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 1"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-5', speedRatio: '1:3' }]])
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

  it('offers Swap and Reverse checkboxes that reapply the current pattern', async () => {
    const wrapper = mount(VtgPane)
    const swap = wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]')
    const reverse = wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]')

    expect(swap.element.checked).toBe(false)
    expect(reverse.element.checked).toBe(false)
    expect(swap.element.nextElementSibling?.textContent).toBe('Swap')
    expect(reverse.element.nextElementSibling?.textContent).toBe('Reverse')

    await wrapper.get('[data-cell-reference="2-6"]').trigger('click')
    await swap.setValue(true)
    await reverse.setValue(true)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '2-6', speedRatio: '1:3' }],
      [{ reference: '2-6', speedRatio: '1:3', swapProps: true }],
      [{ reference: '2-6', speedRatio: '1:3', swapProps: true, reversePlane: true }],
    ])
  })

  it('offers capped BPM and Scale sliders that reapply the current pattern', async () => {
    const wrapper = mount(VtgPane)
    const bpm = wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]')
    const scale = wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]')
    const outputs = wrapper.findAll('fieldset.vtg-slider-controls output')

    expect(bpm.attributes()).toMatchObject({ min: '40', max: '140', step: '1' })
    expect(scale.attributes()).toMatchObject({ min: '0.5', max: '1.4', step: '0.1' })
    expect(bpm.element.value).toBe('120')
    expect(scale.element.value).toBe('0.8')
    expect(outputs.map((output) => output.text())).toEqual(['120', '0.8'])

    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')
    await bpm.setValue(40)
    await scale.setValue(1.4)

    expect(wrapper.emitted('patternSelect')).toEqual([
      [{ reference: '1-6', speedRatio: '1:3' }],
      [{ reference: '1-6', speedRatio: '1:3', bpm: 40 }],
      [{ reference: '1-6', speedRatio: '1:3', bpm: 40, scale: 1.4 }],
    ])
    expect(outputs.map((output) => output.text())).toEqual(['40', '1.4'])
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
    })
    if (!animation) throw new Error('Expected a supported VTG animation')

    await wrapper.setProps({ animation })
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('5-6')
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').element.value).toBe('87')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').element.value).toBe('0.6')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
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

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('1-6')
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-6', speedRatio: '1:3' }]])
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
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('3-4')
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
    await nextTick()

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
    await nextTick()

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
    expect(toggle.classes()).not.toContain('vtg-tile__spin-toggle--lower-right')
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
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').classes()).toContain(
      'vtg-tile__spin-toggle--lower-right',
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

  it('selects a random matrix cell from the bottom-left button', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(VtgPane)

    await wrapper.get('.vtg-shuffle').trigger('click')

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBe('1-6')
    expect(wrapper.get('[data-cell-reference="1-6"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-6', speedRatio: '1:3' }]])
  })

  it('keeps the left column and bottom row inert for now', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')

    await wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 6"]').trigger('click')
    await wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 1"]').trigger('click')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
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

    const bottomSplitRule = wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 5"]')
    const bottomSplitProps = bottomSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(bottomSplitProps.map(({ element }) => element.style.insetInlineStart)).toEqual([
      '4%',
      '48%',
    ])
    expect(
      bottomSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetInlineStart,
    ).toBe('97%')

    const sideSplitRule = wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]')
    const sideSplitProps = sideSplitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(sideSplitProps.map(({ element }) => element.style.insetBlockStart)).toEqual([
      '4%',
      '48%',
    ])
    expect(
      sideSplitRule.get<HTMLElement>('[data-role="vtg-divider"]').element.style.insetBlockStart,
    ).toBe('97%')
    expect(sideSplitRule.findAll('.vtg-rule-card__prop-handle')).toHaveLength(4)
  })

  it('places the bottom TOG IN props after the divider', () => {
    const wrapper = mount(VtgPane)
    const togInRule = wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 3"]')
    const props = togInRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(props.map(({ element }) => element.style.insetInlineStart)).toEqual(['59%', '59%'])
    expect(props.map(({ element }) => element.style.inlineSize)).toEqual(['37%', '37%'])
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
    ).toEqual(['1-6', '3-6', '5-6', '1-4', '3-4', '5-4', '1-2', '3-2', '5-2'])
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
    await expectNineMorePreviews(async () => {
      await wrapper.get('[data-cell-reference="5-6"]').trigger('click')
      await wrapper.get('[data-role="vtg-spin-toggle"]').trigger('click')
    })
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true),
    )
    await expectNineMorePreviews(() =>
      wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(1.1),
    )
    await expectNineMorePreviews(() => reportAllBlankDimensions(80, 76))
  })
})
