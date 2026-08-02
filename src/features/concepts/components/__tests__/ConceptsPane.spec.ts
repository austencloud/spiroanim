import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
describe('ConceptsPane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('switches between VTG and Quarter Spacing while preserving shared controls', async () => {
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
    await selector.setValue('qtr')

    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="qtr-pane"]').attributes('data-concept')).toBe('qtr')
    expect(wrapper.get<HTMLInputElement>('input[value="1:5"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-quarters"]').element.checked).toBe(true)

    await wrapper.get('[data-cell-reference="2-2"]').trigger('click')
    expect(wrapper.emitted('patternSelect')?.at(-1)).toEqual([
      {
        reference: '2-2',
        speedRatio: '1:5',
        swapProps: true,
        reversePlane: true,
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
  })

  it('shows the Eight Step coming-soon pane without selecting a pattern', async () => {
    const wrapper = mount(ConceptsPane)
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    await selector.setValue('8stp')

    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="qtr-pane"]').exists()).toBe(false)
    expect(wrapper.get('#eight-step-status').text()).toBe('Coming soon!')
    expect(wrapper.emitted('patternSelect')).toBeUndefined()
  })
})
