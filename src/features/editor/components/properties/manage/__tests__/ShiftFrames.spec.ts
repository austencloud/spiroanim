import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import ShiftFrames from '@/features/editor/components/properties/manage/ShiftFrames.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { AnimData, RootData } from '@/types/AnimTypes'

const closedFrames = (): AnimData[] => [
  { arc: 0, beats: 2, scale: 8 },
  { arc: 90, beats: 3, scale: 8 },
  { arc: 90, plane: 180, beats: 4, scale: 8 },
]

const openFrames = (): AnimData[] => [{ arc: 0 }, { arc: 45 }, { arc: 45 }]

const createRoot = (props: AnimData[][]) =>
  rootFinal({
    bpm: 120,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: true,
    hands: true,
    visible: true,
    nodes: false,
    anchors: false,
    props: props.map((anim) => ({ anim })),
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  } satisfies RootData)

describe('ShiftFrames', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shifts every selected closed prop and leaves unselected props unchanged', async () => {
    const storeId = 'shift-selected'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot([closedFrames(), closedFrames(), openFrames()])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pSELECTED = { 0: true, 1: true, 2: false }
    const unselected = structuredClone(ROOT.value.props[2]!.anim)
    await nextTick()

    const wrapper = mount(ShiftFrames, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')

    expect(ROOT.value.props[0]!.anim[0]).toMatchObject({ arc: 90, beats: 3, scale: 8 })
    expect(ROOT.value.props[1]!.anim[0]).toMatchObject({ arc: 90, beats: 3, scale: 8 })
    expect(ROOT.value.props[2]!.anim).toEqual(unselected)
  })

  it('is disabled and changes nothing when any selected prop is not closed', async () => {
    const storeId = 'shift-ineligible'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = createRoot([closedFrames(), openFrames()])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pSELECTED = { 0: true, 1: true }
    const original = structuredClone(ROOT.value.props)
    await nextTick()

    const wrapper = mount(ShiftFrames, {
      global: { provide: { store: ref(storeId) } },
    })
    const link = wrapper.get('a')
    expect(link.attributes('aria-disabled')).toBe('true')
    await link.trigger('click')

    expect(ROOT.value.props).toEqual(original)
  })
})
