import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { createDefaultEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
describe('ConceptsPane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('switches between all three concepts while preserving shared controls', async () => {
    const wrapper = mount(ConceptsPane)
    const pane = wrapper.get('[data-concepts-pane]')
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    expect(pane.classes()).toContain('scrollbar')
    expect(selector.element.value).toBe('vtg')
    expect(selector.attributes('aria-label')).toBe('Concept')
    expect(selector.findAll('option').map((option) => option.text())).toEqual([
      'Vulkan Tech Gospel',
      'Quarter Spacing',
      'Eight Step',
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
    await selector.setValue('qtr')

    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="qtr-pane"]').attributes('data-concept')).toBe('qtr')
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

    await selector.setValue('vtg')

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-concept')).toBe('vtg')
    expect(wrapper.find('[data-role="qtr-pane"]').exists()).toBe(false)
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

  it('preserves shared controls when VTG and QTR receive an Eight Step animation', async () => {
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

    await selector.setValue('qtr')
    await flushPromises()
    expectSharedControls()
    expect(wrapper.find('[data-role="qtr-pane"]').exists()).toBe(true)
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(0)
  })
})
