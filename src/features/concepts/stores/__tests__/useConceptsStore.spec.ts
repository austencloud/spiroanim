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

  it('defaults to VTG with shared pattern controls', () => {
    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('vtg')
    expect(store.speedRatio).toBe('1:3')
    expect(store.swapProps).toBe(false)
    expect(store.reversePlane).toBe(false)
    app.unmount()
  })

  it('resets an unsupported persisted concept to VTG', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: 'unknown' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('vtg')
    app.unmount()
  })

  it('hydrates Quarter Spacing and its shared pattern controls', () => {
    localStorage.setItem(
      'sa-concepts',
      JSON.stringify({
        selectedConcept: 'qtr',
        speedRatio: '1:5',
        swapProps: true,
        reversePlane: true,
      }),
    )

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('qtr')
    expect(store.speedRatio).toBe('1:5')
    expect(store.swapProps).toBe(true)
    expect(store.reversePlane).toBe(true)
    app.unmount()
  })
})
