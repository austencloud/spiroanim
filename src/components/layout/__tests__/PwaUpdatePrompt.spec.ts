import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import PwaUpdatePrompt from '@/components/layout/PwaUpdatePrompt.vue'
import { useQueryVersionStore } from '@/stores/useQueryVersionStore'

describe('PwaUpdatePrompt', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('warns without decoding when a URL version is unsupported', async () => {
    const store = useQueryVersionStore()
    const wrapper = mount(PwaUpdatePrompt)

    expect(wrapper.find('.pwa-update').exists()).toBe(false)

    store.reportUnsupportedVersion(4)
    await nextTick()

    expect(wrapper.get('.pwa-update').text()).toContain('unsupported format v4')
    expect(wrapper.get('.pwa-update').text()).toContain('data has not been loaded or changed')
    expect(wrapper.get('.primary-action').text()).toBe('Reload and Check Again')

    await wrapper.get('.pwa-update-actions button:last-child').trigger('click')
    expect(store.unsupportedVersion).toBeUndefined()
    expect(wrapper.find('.pwa-update').exists()).toBe(false)
  })
})
