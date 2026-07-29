import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useExportSettingsStore } from '@/stores/useExportSettingsStore'

function activatePersistedPinia() {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
}

describe('useExportSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    activatePersistedPinia()
  })

  it('persists image and video export preferences between store sessions', async () => {
    const store = useExportSettingsStore()
    store.fileName = 'Favorite Pattern'
    store.imageResolution = '1920x1080'
    store.imageFileType = 'image/webp'
    store.imageHiddenFeatures.paths = true
    store.videoResolution = '3840x2160'
    store.videoFramerate = 30
    store.videoCodec = 'vp09.00.10.08'
    await nextTick()

    expect(localStorage.getItem('sa-export-settings-v1')).not.toBeNull()

    activatePersistedPinia()
    const restored = useExportSettingsStore()
    expect(restored.fileName).toBe('Favorite Pattern')
    expect(restored.imageResolution).toBe('1920x1080')
    expect(restored.imageFileType).toBe('image/webp')
    expect(restored.imageHiddenFeatures.paths).toBe(true)
    expect(restored.videoResolution).toBe('3840x2160')
    expect(restored.videoFramerate).toBe(30)
    expect(restored.videoCodec).toBe('vp09.00.10.08')
  })
})
