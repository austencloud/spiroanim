import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
describe('ConceptsPane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('keeps VTG in the Concepts selector and forwards its selections', async () => {
    const wrapper = mount(ConceptsPane)
    const pane = wrapper.get('[data-concepts-pane]')
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    expect(pane.classes()).toContain('scrollbar')
    expect(selector.element.value).toBe('vtg')
    expect(selector.attributes('aria-label')).toBe('Concept')
    expect(selector.findAll('option').map((option) => option.text())).toEqual([
      'Vulkan Tech Gospel',
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
  })
})
