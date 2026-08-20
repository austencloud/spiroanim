import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VtgPane from '@/features/vtg/components/VtgPane.vue'

vi.mock('@/utils/device', () => ({ isTouchDevice: () => true }))

describe('VtgPane touch Builder', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('disables native panning on drag cells in the full Builder catalog', () => {
    const wrapper = mount(VtgPane, {
      props: { builderActive: true, builderFullCatalog: true },
    })

    const pane = wrapper.get('[data-role="vtg-pane"]')
    expect(pane.classes()).toContain('vtg-pane--touch')
    expect(pane.classes()).toContain('vtg-pane--builder-active')
    expect(wrapper.get('[data-role="vtg-tile"]').attributes('draggable')).toBe('false')
  })
})
