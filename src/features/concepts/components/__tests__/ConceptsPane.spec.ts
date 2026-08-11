import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import { createDefaultQstAnimation } from '@/features/quarter-space-tech/createQstAnimation'

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
const scrollIntoView = vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>()

describe('ConceptsPane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    scrollIntoView.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalScrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      })
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    }
  })

  it('integrates QTR into VTG while preserving shared controls across concepts', async () => {
    const wrapper = mount(ConceptsPane)
    const pane = wrapper.get('[data-concepts-pane]')
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    expect(pane.classes()).toContain('scrollbar')
    expect(selector.element.value).toBe('vtg')
    expect(selector.attributes('aria-label')).toBe('Concept')
    expect(selector.findAll('option').map((option) => option.text())).toEqual([
      'Vulkan Tech Gospel',
      'Eight Step',
      'Quarter Space Tech',
      'The Kinetic Alphabet',
    ])
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-concept')).toBe('vtg')

    await wrapper.get('[data-cell-reference="1-1"]').trigger('click')

    expect(wrapper.emitted('patternSelect')).toEqual([
      [
        {
          reference: '1-1',
          speedRatio: '1:3',
        },
      ],
    ])

    await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').setValue(84)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(1.2)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]').setValue(11)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').setValue(true)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-concept')).toBe('vtg')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[value="1:5"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-quarters"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').element.value).toBe('84')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').element.value).toBe('1.2')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-thick"]').element.value).toBe('11')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-paths"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-hands"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-arms"]').element.checked).toBe(false)

    await wrapper.get('[data-cell-reference="2-2"]').trigger('click')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      {
        reference: '2-2',
        speedRatio: '1:5',
        swapProps: true,
        reversePlane: true,
        bpm: 84,
        scale: 1.2,
        thick: 11,
        paths: false,
        hands: true,
        arms: false,
        quarters: 1,
      },
    ])

    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(false)

    expect(wrapper.get<HTMLInputElement>('input[value="1:5"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)
    expect(wrapper.find('[data-role="vtg-quarters"]').exists()).toBe(false)

    await selector.setValue('8stp')

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

    await wrapper.get('[data-cell-reference="4-II"]').trigger('click')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      {
        concept: '8stp',
        reference: '4-II',
        swapProps: true,
        reversePlane: true,
        bpm: 84,
        scale: 1.2,
        thick: 11,
        paths: false,
        hands: true,
        arms: false,
      },
    ])
  })

  it('shows the Eight Step matrix without selecting an unfinished pattern', async () => {
    const wrapper = mount(ConceptsPane)
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    await selector.setValue('8stp')

    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qtr-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="eight-step-pane"]').attributes('data-role')).toBe(
      'eight-step-pane',
    )
    expect(wrapper.findAll('[data-role="eight-step-cell"]')).toHaveLength(72)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('shows The Kinetic Alphabet placeholder last without selecting a pattern', async () => {
    const wrapper = mount(ConceptsPane)
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    await selector.setValue('tka')

    expect(selector.element.value).toBe('tka')
    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="eight-step-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="tka-pane"]').text()).toContain('The Kinetic Alphabet')
    expect(wrapper.get('[data-role="tka-pane"]').text()).toContain('Possibly coming soon')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })

  it('shows the Quarter Space Tech libraries before The Kinetic Alphabet', async () => {
    const wrapper = mount(ConceptsPane)
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    await selector.setValue('qst')

    expect(selector.element.value).toBe('qst')
    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="eight-step-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="qst-pane"]').text()).toContain('Quarter Space Tech')
    expect(wrapper.findAll('[data-role="qst-collection"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-role="qst-collection"]').map((item) => item.text())).toEqual([
      expect.stringContaining('Quarter "Time" Breaks'),
      expect.stringContaining('Quarter "Time" Advanced'),
      expect.stringContaining('Quarter Space Beyond'),
    ])
    expect(wrapper.find('[data-role="qst-reset"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qst-paths"]').exists()).toBe(false)
    const labelGuide = wrapper.get('[data-role="qst-label-guide"]')
    expect(labelGuide.text()).toContain('TS means Together to Split')
    expect(labelGuide.text()).toContain('SQ means Split to Quarter')
    expect(labelGuide.text()).toContain('FBFollow Break')
    expect(labelGuide.text()).toContain('OBOpposite Break')
    expect(wrapper.get('[data-role="qst-history-note"]').text()).toContain(
      'Quarter Space Tech predates SpiroAnim',
    )
    const more = wrapper.get('[data-role="qst-more"]')
    expect(more.get('summary').text()).toBe('MORE...')
    expect(more.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/docs/qst/01_Quarter_Time_Breaks.pdf',
      '/docs/qst/02_Quarter_Time_Advanced.pdf',
      '/docs/qst/03_Quarter_Space_Beyond.pdf',
    ])
    expect(more.text()).toContain('original Quarter Space Tech documents')
    expect(more.text()).toContain('legacy purposes')
    expect(wrapper.find('[data-role="tka-pane"]').exists()).toBe(false)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()

    await wrapper.get('[data-collection="breaks"]').trigger('click')
    expect(wrapper.find('[data-role="qst-label-guide"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qst-history-note"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qst-more"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qst-reset"]').exists()).toBe(true)
    expect(wrapper.find('[data-role="qst-paths"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-role="qst-pattern-card"]')).toHaveLength(8)
    expect(wrapper.findAll('[data-role="qst-page"]')).toHaveLength(14)
    expect(wrapper.find('[data-role="qst-pagination-top"]').exists()).toBe(true)
    expect(wrapper.find('[data-role="qst-pagination-bottom"]').exists()).toBe(true)

    await wrapper.get('[data-role="qst-page"][data-page="3"]').trigger('click')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="advanced"]').trigger('click')
    await wrapper.get('[data-role="qst-page"][data-page="2"]').trigger('click')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="breaks"]').trigger('click')
    expect(wrapper.get('[data-role="qst-page"][aria-current="page"]').text()).toBe('3')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="advanced"]').trigger('click')
    expect(wrapper.get('[data-role="qst-page"][aria-current="page"]').text()).toBe('2')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="breaks"]').trigger('click')
    await wrapper.get('[data-pattern-reference="breaks-17"] button').trigger('click')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      { concept: 'qst', reference: 'breaks-17' },
    ])
    await wrapper.get('[data-role="qst-page"][data-page="4"]').trigger('click')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="breaks"]').trigger('click')
    expect(wrapper.get('[data-role="qst-page"][aria-current="page"]').text()).toBe('3')
  })

  it('opens the matching QST library page and highlights the loaded pattern', async () => {
    const store = useConceptsStore()
    store.selectedConcept = 'qst'
    const animation = createDefaultQstAnimation({
      concept: 'qst',
      reference: 'beyond-100',
      swapProps: true,
      reversePlane: true,
      bpm: 87,
      scale: 1.2,
      thick: 12,
      paths: false,
      hands: true,
      arms: false,
      right: false,
    })
    if (!animation) throw new Error('Expected a supported QST animation')

    const wrapper = mount(ConceptsPane, { props: { animation, animationReady: true } })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-role="qst-library"]').exists()).toBe(true))

    expect(wrapper.get('[data-role="qst-library"]').text()).toContain('Quarter Space Beyond')
    expect(wrapper.get('[data-role="qst-page"][aria-current="page"]').text()).toBe('13')
    const selectedPattern = wrapper.get('[data-pattern-reference="beyond-100"]')
    expect(selectedPattern.classes()).toContain('qst-pattern-card--selected')
    expect(selectedPattern.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-reverse"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-bpm"]').element.value).toBe('87')
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-scale"]').element.value).toBe('1.2')
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-thick"]').element.value).toBe('12')
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-paths"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-hands"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-arms"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('[data-role="qst-right"]').element.checked).toBe(false)
    expect(wrapper.emitted('patternSelect')).toBeUndefined()

    await wrapper.get('[data-role="qst-page"][data-page="14"]').trigger('click')
    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="beyond"]').trigger('click')
    expect(wrapper.get('[data-role="qst-page"][aria-current="page"]').text()).toBe('13')
  })

  it('instantly scrolls a hidden selected pattern into view when its library opens', async () => {
    const store = useConceptsStore()
    store.selectedConcept = 'qst'
    const animation = createDefaultQstAnimation({
      concept: 'qst',
      reference: 'beyond-100',
    })
    if (!animation) throw new Error('Expected a supported QST animation')

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this instanceof HTMLElement && this.matches('[data-concepts-pane]')) {
        return new DOMRect(0, 0, 320, 500)
      }
      if (this instanceof HTMLElement && this.dataset.patternReference === 'beyond-100') {
        return new DOMRect(0, 700, 300, 180)
      }
      return new DOMRect(0, 0, 0, 0)
    })

    const wrapper = mount(ConceptsPane, { props: { animation, animationReady: true } })
    await vi.waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'instant',
        block: 'nearest',
        inline: 'nearest',
      }),
    )
    const initialCallCount = scrollIntoView.mock.calls.length

    await wrapper.get('[data-role="qst-back"]').trigger('click')
    await wrapper.get('[data-collection="beyond"]').trigger('click')
    await vi.waitFor(() =>
      expect(scrollIntoView.mock.calls.length).toBeGreaterThan(initialCallCount),
    )
  })

  it('preserves shared controls when merged VTG receives an Eight Step animation', async () => {
    const store = useConceptsStore()
    store.selectedConcept = '8stp'
    const animation = createDefaultEightStepAnimation({
      concept: '8stp',
      reference: '4-II',
      swapProps: true,
      reversePlane: true,
      bpm: 84,
      scale: 1.2,
      thick: 11,
      paths: false,
      hands: true,
      arms: false,
    })
    expect(animation).toBeDefined()

    const wrapper = mount(ConceptsPane, { props: { animation } })
    await flushPromises()
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    store.swapProps = true
    store.reversePlane = true
    store.bpm = 84
    store.scale = 1.2
    store.thick = 11
    store.paths = false
    store.hands = true
    store.arms = false
    await nextTick()

    const expectSharedControls = () => {
      expect(store.swapProps).toBe(true)
      expect(store.reversePlane).toBe(true)
      expect(store.bpm).toBe(84)
      expect(store.scale).toBe(1.2)
      expect(store.thick).toBe(11)
      expect(store.paths).toBe(false)
      expect(store.hands).toBe(true)
      expect(store.arms).toBe(false)
    }

    expectSharedControls()

    await selector.setValue('vtg')
    await flushPromises()
    expectSharedControls()
    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(true)
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(0)

    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)
    await flushPromises()
    expectSharedControls()
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').element.checked).toBe(true)
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(0)
  })
})
