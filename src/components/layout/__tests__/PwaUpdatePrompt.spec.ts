import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PwaUpdatePrompt from '@/components/layout/PwaUpdatePrompt.vue'
import { pwaUpdateControllerKey, type PwaUpdateController } from '@/composables/usePwaUpdate'
import { useQueryVersionStore } from '@/stores/useQueryVersionStore'

describe('PwaUpdatePrompt', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('warns without decoding when a URL version is unsupported', async () => {
    const store = useQueryVersionStore()
    const wrapper = mount(PwaUpdatePrompt)

    expect(wrapper.find('.pwa-update').exists()).toBe(false)

    store.reportUnsupportedVersion(4)
    await nextTick()

    await vi.waitFor(() =>
      expect(wrapper.get('.pwa-update').text()).toContain('Format v4 needs a newer SpiroAnim.'),
    )
    expect(wrapper.get('.pwa-update').classes()).toContain('pwa-update--unsupported')
    expect(wrapper.get('.primary-action').text()).toBe('Reload and Check Again')

    await wrapper.get('.pwa-update-actions button:last-child').trigger('click')
    expect(store.unsupportedVersion).toBeUndefined()
    expect(wrapper.find('.pwa-update').exists()).toBe(false)
  })

  it('checks, displays progress, and applies a ready update for an unsupported format', async () => {
    const needRefresh = ref(false)
    let finishUpdateCheck: (available: boolean) => void = () => undefined
    const updateCheck = new Promise<boolean>((resolve) => {
      finishUpdateCheck = resolve
    })
    const applyUpdate = vi.fn<() => void>()
    const checkForUpdate = vi.fn<() => Promise<boolean>>(() => updateCheck)
    const controller: PwaUpdateController = {
      applyUpdate,
      checkForUpdate,
      dismiss: vi.fn<() => void>(),
      needRefresh,
      offlineReady: ref(false),
      updateFailed: ref(false),
      updateInstalling: ref(false),
    }
    const wrapper = mount(PwaUpdatePrompt, {
      global: {
        provide: { [pwaUpdateControllerKey as symbol]: controller },
      },
    })
    const store = useQueryVersionStore()

    store.reportUnsupportedVersion(12)
    await nextTick()

    expect(checkForUpdate).toHaveBeenCalledOnce()
    expect(wrapper.get('.pwa-update').attributes('role')).toBe('status')
    expect(wrapper.get('.pwa-update').text()).toContain('Downloading an update for format v12...')
    expect(wrapper.find('.update-spinner').exists()).toBe(true)
    expect(wrapper.find('.pwa-update-actions').exists()).toBe(false)

    finishUpdateCheck(true)
    await vi.waitFor(() => expect(wrapper.find('.update-spinner').exists()).toBe(false))

    needRefresh.value = true
    await nextTick()

    expect(applyUpdate).toHaveBeenCalledOnce()
    expect(wrapper.get('.pwa-update').text()).toContain('Applying the update for format v12...')
    expect(wrapper.find('.update-spinner').exists()).toBe(true)
    expect(wrapper.find('.pwa-update-actions').exists()).toBe(false)
  })
})
