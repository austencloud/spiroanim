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
    expect(store.quickSlotCount).toBe(0)
    expect(store.selectedQuickSlot).toBeNull()
    expect(store.quickSlotPaths).toEqual([])
    expect(store.qtrEnabled).toBe(false)
    expect(store.speedRatio).toBe('1:3')
    expect(store.swapProps).toBe(false)
    expect(store.reversePlane).toBe(false)
    expect(store.bpm).toBe(40)
    expect(store.scale).toBe(0.8)
    expect(store.thick).toBe(5)
    expect(store.spacing).toBe(1)
    expect(store.paths).toBe(true)
    expect(store.hands).toBe(false)
    expect(store.arms).toBe(true)
    expect(store.leftPropVisible).toBe(true)
    expect(store.rightPropVisible).toBe(true)
    expect(store.leftPropColor).toBe('Cyan')
    expect(store.rightPropColor).toBe('Green')
    expect(store.customizeExpanded).toBe(false)
    app.unmount()
  })

  it('restores four Quick Slots and allows removing all of them', () => {
    const { app, store } = mountStore()

    store.restoreQuickSlots()
    expect(store.quickSlotCount).toBe(4)
    expect(store.quickSlotPaths).toEqual([null, null, null, null])

    store.addQuickSlot()
    expect(store.quickSlotCount).toBe(5)
    expect(store.quickSlotPaths).toEqual([null, null, null, null, null])

    store.selectedQuickSlot = 5
    store.removeQuickSlot()
    expect(store.quickSlotCount).toBe(4)
    expect(store.selectedQuickSlot).toBe(4)
    expect(store.quickSlotPaths).toEqual([null, null, null, null])

    store.removeQuickSlot()
    store.removeQuickSlot()
    store.removeQuickSlot()
    store.removeQuickSlot()
    expect(store.quickSlotCount).toBe(0)
    expect(store.selectedQuickSlot).toBeNull()
    expect(store.quickSlotPaths).toEqual([])

    app.unmount()
  })

  it('saves a path only in the selected Quick Slot', () => {
    const { app, store } = mountStore()

    store.restoreQuickSlots()
    store.selectedQuickSlot = 3
    store.saveCurrentQuickSlot('/play-vtg?r=pattern&v=6')

    expect(store.quickSlotPaths).toEqual([null, null, '/play-vtg?r=pattern&v=6', null])

    store.clearQuickSlot(3)
    expect(store.quickSlotPaths).toEqual([null, null, null, null])
    app.unmount()
  })

  it('saves, overwrites, and loads named Quick Slot sets by stable ID', () => {
    const { app, store } = mountStore()
    store.restoreQuickSlots()
    store.quickSlotPaths = ['/play-vtg?r=one&v=6', null, '/play-time?r=three&v=6', null]
    store.selectedQuickSlot = 3

    const firstId = store.saveNewQuickSlotSet('Practice')
    expect(firstId).toBe('quick-slot-set-1')
    expect(store.selectedQuickSlotSetId).toBe(firstId)
    expect(store.quickSlotSets).toEqual([
      {
        id: firstId,
        name: 'Practice',
        paths: ['/play-vtg?r=one&v=6', null, '/play-time?r=three&v=6', null],
        selectedSlot: 3,
      },
    ])

    store.quickSlotPaths[0] = '/play-vtg?r=updated&v=6'
    expect(store.quickSlotSets[0]?.paths[0]).toBe('/play-vtg?r=one&v=6')
    expect(store.overwriteQuickSlotSet(firstId, 'Practice Updated')).toBe(true)

    store.quickSlotPaths = []
    store.quickSlotCount = 0
    store.selectedQuickSlot = null
    expect(store.loadQuickSlotSet(firstId)).toBe(true)
    expect(store.quickSlotCount).toBe(4)
    expect(store.quickSlotPaths[0]).toBe('/play-vtg?r=updated&v=6')
    expect(store.selectedQuickSlot).toBe(3)
    expect(store.quickSlotSets[0]?.name).toBe('Practice Updated')

    expect(store.deleteQuickSlotSet(firstId)).toBe(true)
    expect(store.quickSlotSets).toEqual([])
    expect(store.selectedQuickSlotSetId).toBeNull()
    app.unmount()
  })

  it('uses the first available default name and remembers the last saved set after hydration', () => {
    localStorage.setItem(
      'sa-concepts',
      JSON.stringify({
        quickSlotSets: [
          {
            id: 'quick-slot-set-4',
            name: 'Quick Slot Set #1',
            paths: ['/play-vtg?r=saved&v=6'],
            selectedSlot: 1,
          },
          {
            id: 'quick-slot-set-7',
            name: 'Quick Slot Set #2',
            paths: ['/play-time?r=second&v=6'],
            selectedSlot: null,
          },
        ],
        selectedQuickSlotSetId: 'quick-slot-set-4',
      }),
    )
    const { app, store } = mountStore()

    expect(store.selectedQuickSlotSetId).toBe('quick-slot-set-4')
    expect(store.nextQuickSlotSetName()).toBe('Quick Slot Set #3')
    app.unmount()
  })

  it('matches Quick Slots by query string without considering the page', () => {
    const { app, store } = mountStore()
    store.restoreQuickSlots()
    store.quickSlotPaths = ['/play-vtg?r=first&v=6', '/8stp-time?r=matching&v=6', null, null]

    store.selectQuickSlotForPath('/qst-play?r=matching&v=6')
    expect(store.selectedQuickSlot).toBe(2)

    store.selectQuickSlotForPath('/8stp-time?r=different&v=6')
    expect(store.selectedQuickSlot).toBeNull()

    app.unmount()
  })

  it('hydrates the Quick Slot count and selected slot', () => {
    localStorage.setItem(
      'sa-concepts',
      JSON.stringify({
        quickSlotCount: 6,
        selectedQuickSlot: 5,
        quickSlotPaths: ['/play-vtg?r=one&v=6', null],
      }),
    )

    const { app, store } = mountStore()

    expect(store.quickSlotCount).toBe(6)
    expect(store.selectedQuickSlot).toBe(5)
    expect(store.quickSlotPaths).toEqual(['/play-vtg?r=one&v=6', null, null, null, null, null])
    app.unmount()
  })

  it('accepts zero persisted Quick Slots and clears the selection', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ quickSlotCount: 0, selectedQuickSlot: 9 }))

    const { app, store } = mountStore()

    expect(store.quickSlotCount).toBe(0)
    expect(store.selectedQuickSlot).toBeNull()
    expect(store.quickSlotPaths).toEqual([])
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
    store.leftPropColor = 'Blue'
    store.rightPropColor = 'Magenta'

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
      leftPropColor: store.leftPropColor,
      rightPropColor: store.rightPropColor,
    }).toEqual({
      speedRatio: '1:3',
      swapProps: false,
      reversePlane: false,
      bpm: 40,
      scale: 0.8,
      thick: 5,
      spacing: 1,
      paths: true,
      hands: false,
      arms: true,
      leftPropVisible: true,
      rightPropVisible: true,
      leftPropColor: 'Cyan',
      rightPropColor: 'Green',
    })
    app.unmount()
  })

  it('persists whether Customize is expanded', () => {
    localStorage.setItem('sa-concepts', JSON.stringify({ customizeExpanded: true }))

    const { app, store } = mountStore()

    expect(store.customizeExpanded).toBe(true)
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
