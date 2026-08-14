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
    expect(store.qtrEnabled).toBe(false)
    expect(store.speedRatio).toBe('1:3')
    expect(store.swapProps).toBe(false)
    expect(store.reversePlane).toBe(false)
    expect(store.bpm).toBe(60)
    expect(store.scale).toBe(0.8)
    expect(store.thick).toBe(5)
    expect(store.spacing).toBe(1)
    expect(store.paths).toBe(true)
    expect(store.hands).toBe(false)
    expect(store.arms).toBe(true)
    expect(store.leftPropVisible).toBe(true)
    expect(store.rightPropVisible).toBe(true)
    app.unmount()
  })

  it('resets every shared pattern control', () => {
    const { app, store } = mountStore()
    store.speedRatio = '1:5'
    store.swapProps = true
    store.reversePlane = true
    store.bpm = 90
    store.scale = 1.2
    store.thick = 12
    store.spacing = 17
    store.paths = false
    store.hands = true
    store.arms = false
    store.leftPropVisible = false
    store.rightPropVisible = false

    store.resetPatternControls()

    expect({
      speedRatio: store.speedRatio,
      swapProps: store.swapProps,
      reversePlane: store.reversePlane,
      bpm: store.bpm,
      scale: store.scale,
      thick: store.thick,
      spacing: store.spacing,
      paths: store.paths,
      hands: store.hands,
      arms: store.arms,
      leftPropVisible: store.leftPropVisible,
      rightPropVisible: store.rightPropVisible,
    }).toEqual({
      speedRatio: '1:3',
      swapProps: false,
      reversePlane: false,
      bpm: 60,
      scale: 0.8,
      thick: 5,
      spacing: 1,
      paths: true,
      hands: false,
      arms: true,
      leftPropVisible: true,
      rightPropVisible: true,
    })
    app.unmount()
  })

  it('resets an unsupported persisted concept to VTG', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: 'unknown' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('vtg')
    app.unmount()
  })

  it('migrates a persisted Quarter Spacing selection into VTG with QTR enabled', () => {
    localStorage.setItem(
      'sa-concepts',
      JSON.stringify({
        selectedConcept: 'qtr',
        speedRatio: '1:5',
        swapProps: true,
        reversePlane: true,
        spacing: 7,
      }),
    )

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('vtg')
    expect(store.qtrEnabled).toBe(true)
    expect(store.speedRatio).toBe('1:5')
    expect(store.swapProps).toBe(true)
    expect(store.reversePlane).toBe(true)
    expect(store.spacing).toBe(7)
    app.unmount()
  })

  it.each(['1:2', '1:4'] as const)('hydrates the supported %s speed ratio', (speedRatio) => {
    localStorage.setItem('sa-concepts', JSON.stringify({ speedRatio }))

    const { app, store } = mountStore()

    expect(store.speedRatio).toBe(speedRatio)
    app.unmount()
  })

  it('hydrates Eight Step as the selected concept', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: '8stp' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('8stp')
    app.unmount()
  })

  it('hydrates The Kinetic Alphabet as the selected concept', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: 'tka' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('tka')
    app.unmount()
  })

  it('hydrates Quarter Space Tech as the selected concept', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ selectedConcept: 'qst' }))

    const { app, store } = mountStore()

    expect(store.selectedConcept).toBe('qst')
    app.unmount()
  })
})
