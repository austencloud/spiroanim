import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useTimelineSettingsStore } from '@/stores/useTimelineSettingsStore'

function activatePersistedPinia() {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
}

describe('useTimelineSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    activatePersistedPinia()
  })

  it('defaults the column offset to zero and persists changes', async () => {
    const store = useTimelineSettingsStore()
    expect(store.columnOffset).toBe(0)

    store.columnOffset = 2
    await nextTick()

    expect(localStorage.getItem('sa-timeline-settings-v1')).not.toBeNull()

    activatePersistedPinia()
    expect(useTimelineSettingsStore().columnOffset).toBe(2)
  })

  it('limits the offset and final column count to their supported ranges', () => {
    const store = useTimelineSettingsStore()

    for (let index = 0; index < 10; index++) store.increaseColumnOffset()
    expect(store.columnOffset).toBe(5)
    expect(store.adjustedColumnCount(4)).toBe(6)

    for (let index = 0; index < 10; index++) store.decreaseColumnOffset()
    expect(store.columnOffset).toBe(-3)
    expect(store.adjustedColumnCount(2)).toBe(1)
  })
})
