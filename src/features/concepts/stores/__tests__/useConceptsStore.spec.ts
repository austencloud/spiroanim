import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp, defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

const mountStore = () => {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  setActivePinia(pinia)

  let store: ReturnType<typeof useConceptsStore> | undefined
  const app = createApp(
    defineComponent({
      setup() {
        store = useConceptsStore()
        return () => h('div')
      },
    }),
  )
  app.use(pinia)
  app.mount(document.createElement('div'))

  if (!store) throw new Error('Concepts store was not created')
  return { app, store }
}

describe('useConceptsStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to VTG and persists the last selected pattern', () => {
    const first = mountStore()

    expect(first.store.selectedConcept).toBe('vtg')
    first.store.selectedConcept = 'qst'
    first.app.unmount()

    const second = mountStore()

    expect(second.store.selectedConcept).toBe('qst')
    second.app.unmount()
  })

  it('resets an unsupported persisted pattern to VTG', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: 'unknown' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('vtg')
    app.unmount()
  })
})
