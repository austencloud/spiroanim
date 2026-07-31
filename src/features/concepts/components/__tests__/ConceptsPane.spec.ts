import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import ConceptsPane from '@/features/concepts/components/ConceptsPane.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

describe('ConceptsPane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('switches between VTG and the blank QST child from the selector', async () => {
    const wrapper = mount(ConceptsPane, {
      global: {
        stubs: {
          VtgPane: { template: '<div data-role="vtg-pane">VTG</div>' },
        },
      },
    })
    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')

    expect(selector.element.value).toBe('vtg')
    expect(selector.attributes('aria-label')).toBe('Concept')
    expect(selector.findAll('option').map((option) => option.text())).toEqual([
      'Vulkan Tech Gospel',
      'Quarter Spacing',
    ])
    expect(wrapper.get('[data-role="vtg-pane"]').text()).toBe('VTG')

    await selector.setValue('qst')

    expect(useConceptsStore().selectedConcept).toBe('qst')
    expect(wrapper.find('[data-role="vtg-pane"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="qst-pattern"]').attributes('aria-label')).toBe('QST')
  })
})
