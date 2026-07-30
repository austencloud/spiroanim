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

const rangedFrames = (): AnimData[] => [
  { arc: 0, beats: 5, scale: 15, depth: -2, adjust: 5, move: [1, 0, 0] },
  { arc: 0, beats: 2, scale: 8, depth: 1, adjust: 10, move: [1, 0, 0] },
  { arc: 90, beats: 3, scale: 9, depth: 2, adjust: 20, move: [2, 0, 0] },
  {
    arc: 90,
    plane: 180,
    beats: 7,
    scale: 12,
    depth: 4,
    adjust: 30,
    move: [3, 0, 0],
  },
  { arc: 45, beats: 11, scale: 14, depth: 6, adjust: 40, move: [4, 0, 0] },
]

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

const expectVectorClose = (actual: readonly number[], expected: readonly number[]) => {
  actual.forEach((coordinate, axis) => expect(coordinate).toBeCloseTo(expected[axis]!, 9))
}

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

  it('shifts only a closed timeline selection and preserves its outgoing boundary', async () => {
    const storeId = 'shift-range'
    const player = usePlayerStore(storeId)
    const { ROOT, COMPILED } = player.raw()
    ROOT.value = createRoot([rangedFrames()])
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pSELECTED = { 0: true }
    await nextTick()

    const originalFrames = structuredClone(ROOT.value.props[0]!.anim)
    const originalCompiled = structuredClone(COMPILED.value.props[0]!.anim)
    const originalTimes = [...player.PTIMES[0]!]
    player.SELECTION = true
    player.SELECTED = [1, 3]
    await nextTick()

    const wrapper = mount(ShiftFrames, {
      global: { provide: { store: ref(storeId) } },
    })
    const link = wrapper.get('a')
    expect(link.attributes('aria-disabled')).toBe('false')
    await link.trigger('click')
    await nextTick()

    const result = COMPILED.value.props[0]!.anim
    expect(ROOT.value.props[0]!.anim[0]).toEqual(originalFrames[0])
    expect(ROOT.value.props[0]!.anim[4]).toEqual(originalFrames[4])
    expectVectorClose(result[1]!.pos, originalCompiled[2]!.pos)
    expectVectorClose(result[2]!.pos, originalCompiled[3]!.pos)
    expectVectorClose(result[3]!.pos, originalCompiled[2]!.pos)
    expect(result[3]).toMatchObject({
      beats: originalCompiled[3]!.beats,
      scale: originalCompiled[3]!.scale,
      depth: originalCompiled[3]!.depth,
      adjust: originalCompiled[3]!.adjust,
    })
    expect(player.PTIMES[0]![3]).toBe(originalTimes[3])
    expect(player.PTIMES[0]![4]).toBe(originalTimes[4])
    expect(player.SELECTED).toEqual([1, 3])
  })
})
