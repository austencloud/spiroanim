import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import InsertFrame from '@/features/editor/components/properties/manage/InsertFrame.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { MotionData, RootDataFinal } from '@/types/AnimTypes'

const createRoot = (motion: MotionData[][]): RootDataFinal =>
  rootFinal({
    bpm: 120,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: true,
    hands: true,
    arms: false,
    visible: true,
    nodes: false,
    anchors: false,
    props: motion.map((frames) => ({ anim: [{ beats: 1 }, {}], motion: frames })),
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  })

describe('InsertFrame', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('creates the first empty Motion frame for every selected prop', async () => {
    const storeId = 'insert-first-motion-frame'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot([[], []])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pSELECTED = { 0: true, 1: true }
    await nextTick()

    const wrapper = mount(InsertFrame, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    await wrapper.get('.action-button').trigger('click')

    expect(ROOT.value.props.map((prop) => prop.motion)).toEqual([[{}], [{}]])
  })

  it('inserts an empty Motion frame after the selected range', async () => {
    const storeId = 'insert-motion-range'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot([
      [{ beats: 1, distance: 1 }, { beats: 1, distance: 2 }, { distance: 3 }],
    ])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pSELECTED = { 0: true }
    await nextTick()
    player.SELECTION = true
    player.SELECTED = [1, 2]
    await nextTick()

    const wrapper = mount(InsertFrame, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    await wrapper.get<HTMLInputElement>('input[value="2"]').setValue(true)
    await wrapper.get('.action-button').trigger('click')

    expect(ROOT.value.props[0]!.motion).toEqual([
      { beats: 1, distance: 1 },
      { beats: 1, distance: 2 },
      { distance: 3 },
      {},
    ])
  })

  it('inserts an empty Motion frame before the selected range', async () => {
    const storeId = 'insert-before-motion-range'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot([
      [{ beats: 1, distance: 1 }, { beats: 1, distance: 2 }, { distance: 3 }],
    ])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pSELECTED = { 0: true }
    await nextTick()
    player.SELECTION = true
    player.SELECTED = [1, 2]
    await nextTick()

    const wrapper = mount(InsertFrame, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    await wrapper.get<HTMLInputElement>('input[value="1"]').setValue(true)
    await wrapper.get('.action-button').trigger('click')

    expect(ROOT.value.props[0]!.motion).toEqual([
      { beats: 1, distance: 1 },
      {},
      { beats: 1, distance: 2 },
      { distance: 3 },
    ])
  })
})
