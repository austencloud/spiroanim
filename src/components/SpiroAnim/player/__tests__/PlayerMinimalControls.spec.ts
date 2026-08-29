import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import PlayerMinimalControls from '@/components/SpiroAnim/player/PlayerMinimalControls.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'

describe('PlayerMinimalControls', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('includes Free Camera and leaves room for an adjacent Builder control', async () => {
    const endClearance = 'calc(var(--size-pane-switch-button) + var(--space-2))'
    const wrapper = mount(PlayerMinimalControls, {
      props: { store: 'main', endClearance },
      global: { provide: { dim: { width: 320, height: 180 } } },
    })
    const store = usePlayerStore('main')
    store.setPlaybackOverride(store.raw().ROOT.value, true)
    const freeCamera = wrapper.get('button[aria-label="Free camera"]')

    expect(freeCamera.attributes('aria-pressed')).toBe('false')
    expect((wrapper.get('.slider').element as HTMLElement).style.right).toBe(endClearance)

    await freeCamera.trigger('click')

    expect(store.freeCamera).toBe(true)
    expect(freeCamera.attributes('aria-pressed')).toBe('true')
  })
})
