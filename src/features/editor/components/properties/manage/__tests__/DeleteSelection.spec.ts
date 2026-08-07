import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import DeleteSelection from '@/features/editor/components/properties/manage/DeleteSelection.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { RootDataFinal } from '@/types/AnimTypes'

const createRoot = (): RootDataFinal =>
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
    props: [
      {
        anim: [{ beats: 1, arc: 0 }, { beats: 1, arc: 45 }, { arc: 90 }],
        motion: [{ beats: 1, distance: 1 }, { beats: 1, distance: 2 }, { distance: 3 }],
      },
    ],
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  })

describe('DeleteSelection', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('deletes a selected Motion range without changing Animation', async () => {
    const storeId = 'delete-motion-selection'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot()
    player.PLAYING = false
    const animation = structuredClone(ROOT.value.props[0]!.anim)

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pSELECTED = { 0: true }
    await nextTick()
    player.SELECTION = true
    player.SELECTED = [1, 2]
    await nextTick()

    const wrapper = mount(DeleteSelection, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    await nextTick()

    expect(ROOT.value.props[0]!.motion).toEqual([{ beats: 1, distance: 1 }])
    expect(ROOT.value.props[0]!.anim).toEqual(animation)
    expect(properties.MOTIONS).toEqual([])
  })

  it('continues deleting only Animation frames when Animation is selected', async () => {
    const storeId = 'delete-animation-selection'
    const player = usePlayerStore(storeId)
    const { ROOT, CURRENT } = player.raw()
    ROOT.value = createRoot()
    player.PLAYING = false
    const motion = structuredClone(ROOT.value.props[0]!.motion)

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'animation'
    properties.pSELECTED = { 0: true }
    await nextTick()
    CURRENT.value = 500
    await nextTick()

    const wrapper = mount(DeleteSelection, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    await nextTick()

    expect(ROOT.value.props[0]!.anim).toEqual([{ beats: 1, arc: 0 }, { arc: 90 }])
    expect(ROOT.value.props[0]!.motion).toEqual(motion)
    expect(properties.ANIMS).toEqual([ROOT.value.props[0]!.anim[1]])
  })

  it('deletes Camera frames but refuses to remove the final frame', async () => {
    const storeId = 'delete-camera-selection'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot()
    ROOT.value.camera.push({ orbit: { beats: 1 }, center: { distance: 1 } })
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'camera'
    await nextTick()
    player.SELECTION = true
    player.SELECTED = [1, 1]
    await nextTick()

    const wrapper = mount(DeleteSelection, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')
    expect(ROOT.value.camera).toHaveLength(1)

    player.SELECTED = [0, 0]
    await nextTick()
    await wrapper.get('a').trigger('click')
    expect(ROOT.value.camera).toHaveLength(1)
  })
})
