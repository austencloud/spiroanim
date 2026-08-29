import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import PlayerFreeCameraControl from '@/components/SpiroAnim/player/PlayerFreeCameraControl.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'

describe('PlayerFreeCameraControl', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shares the main player mode while temporary playback is overridden', async () => {
    const store = usePlayerStore('main')
    store.setPlaybackOverride(store.raw().ROOT.value, true)
    const wrapper = mount({
      components: { PlayerFreeCameraControl },
      template: `
        <div>
          <PlayerFreeCameraControl store="main" />
          <PlayerFreeCameraControl store="main" compact />
        </div>
      `,
    })
    const buttons = wrapper.findAll('button[aria-label="Free camera"]')

    expect(buttons).toHaveLength(2)
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['false', 'false'])

    await buttons[1]!.trigger('click')

    expect(store.freeCamera).toBe(true)
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'true'])
    expect(buttons[1]!.classes()).toContain('free-camera-control--compact')
  })
})
