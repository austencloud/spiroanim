import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp, defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'

const mountStore = () => {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  setActivePinia(pinia)
  const app = createApp(defineComponent({ render: () => h('div') }))
  app.use(pinia)
  app.mount(document.createElement('div'))
  return { app, store: useEditorAccessStore() }
}

describe('useEditorAccessStore', () => {
  beforeEach(() => localStorage.clear())

  it('disables Editor rotation access by default', () => {
    const { app, store } = mountStore()

    expect(store.editorEnabled).toBe(false)
    expect(store.editorLoaded).toBe(false)
    app.unmount()
  })

  it('hydrates the persisted Editor access preference', () => {
    localStorage.setItem('sa-editor-access', JSON.stringify({ editorEnabled: true }))

    const { app, store } = mountStore()

    expect(store.editorEnabled).toBe(true)
    expect(store.editorLoaded).toBe(false)
    app.unmount()
  })

  it('does not persist whether Editor loaded during the session', async () => {
    const { app, store } = mountStore()
    store.editorEnabled = true
    store.editorLoaded = true
    await nextTick()

    expect(JSON.parse(localStorage.getItem('sa-editor-access') ?? '{}')).toEqual({
      editorEnabled: true,
    })
    app.unmount()

    const remounted = mountStore()
    expect(remounted.store.editorLoaded).toBe(false)
    remounted.app.unmount()
  })
})
