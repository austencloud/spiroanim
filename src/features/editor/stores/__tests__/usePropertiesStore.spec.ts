import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { useProperties } from '@/features/editor/composables/useProperties'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { cartesianToMotionAngles, createMotionDirectionState } from '@/math/animation/MotionFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'

const activatePersistedPinia = () => {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
}

describe('usePropertiesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  async function createPopulatedStore(id: string) {
    const player = usePlayerStore(id)
    const runtime = player.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ arc: 45, beats: 1 }, { beats: 1 }], motion: [] }],
    }
    await nextTick()
    return { player, properties: usePropertiesStore(id) }
  }

  it('derives the active property and animation from the player selection', async () => {
    const { properties } = await createPopulatedStore('editor-selection')

    expect(properties.ACTIVE).toEqual([0])
    expect(properties.PROPS).toHaveLength(1)
    expect(properties.ANIMS).toHaveLength(1)
    expect(properties.IDENT).toEqual([{ prop: 0, index: 0 }])
    expect(properties.ARCDENOM).toBe(45)

    properties.pBOUND = false
    usePlayerStore('editor-selection').SELECTION = true
    usePlayerStore('editor-selection').SELECTED = [0, 1]
    await nextTick()

    expect(properties.ANIMS).toHaveLength(2)
    expect(properties.IDENT).toEqual([
      { prop: 0, index: 0 },
      { prop: 0, index: 1 },
    ])
  })

  it('updates the selected animation through the editor composable', async () => {
    const { player } = await createPopulatedStore('editor-update')
    const editor = useProperties('editor-update')
    player.PLAYING = false

    editor.animSet('beats', 2)

    expect(player.raw().ROOT.value.props[0]!.anim[0]!.beats).toBe(2)
    expect(editor.animGet('beats')).toEqual([2, true, '2', false])
  })

  it('uses independent Motion timing and edits Motion without changing Animation', async () => {
    const player = usePlayerStore('editor-motion')
    const runtime = player.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }],
          motion: [{ beats: 1, plane: 0, arc: 90, distance: 2 }],
        },
      ],
    }
    await nextTick()

    const properties = usePropertiesStore('editor-motion')
    properties.pFRAMES = 'motion'
    await nextTick()

    expect(player.ETIMES).toEqual([0, 2000])
    expect(properties.MOTIONS).toEqual([{ beats: 1, plane: 0, arc: 90, distance: 2 }])

    player.PLAYING = false
    useProperties('editor-motion').motionSet('movexyz', [4, 0, 0])
    expect(runtime.ROOT.value.props[0]!.motion[0]).toEqual({
      beats: 1,
      plane: 0,
      arc: 90,
      distance: 4,
    })
    expect(runtime.ROOT.value.props[0]!.anim).toEqual([{ beats: 1 }, { beats: 1 }, { beats: 1 }])
  })

  it('derives displayed Motion times from selected props and can show every prop', async () => {
    const storeId = 'editor-selected-motion-times'
    const player = usePlayerStore(storeId)
    player.raw().ROOT.value = {
      ...player.raw().ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 1 }, { beats: 1 }, { beats: 2 }, {}],
          motion: [{ beats: 1 }, {}],
        },
        {
          anim: [{ beats: 0.5 }, { beats: 3.5 }, {}],
          motion: [{ beats: 2 }, {}],
        },
      ],
    }
    await nextTick()

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pMULTI = true
    properties.pSELECTED = { 0: true, 1: false }
    await nextTick()

    expect(player.ETIMES).toEqual([0, 1000, 4000])

    properties.pSELECTED[0] = false
    properties.pSELECTED[1] = true
    await nextTick()

    expect(player.ETIMES).toEqual([0, 2000, 4000])

    properties.showFullTimeline = true
    await nextTick()

    expect(player.ETIMES).toEqual([0, 500, 1000, 2000, 4000])
    expect(properties.pFRAMES).toBe('motion')
  })

  it('displays an unauthored Move as the inherited zero vector', async () => {
    const storeId = 'editor-motion-zero'
    const player = usePlayerStore(storeId)
    player.raw().ROOT.value = {
      ...player.raw().ROOT.value,
      props: [{ anim: [{}], motion: [{}] }],
    }
    await nextTick()

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    await nextTick()

    expect(useProperties(storeId).motionGet('move')).toEqual([
      [0, 0, 0],
      true,
      '0.0, 0.0, 0.0',
      true,
    ])
  })

  it('preserves the next authored Cartesian movement across empty downstream frames', async () => {
    const storeId = 'editor-motion-preserve'
    const player = usePlayerStore(storeId)
    const runtime = player.raw()
    const directionState = createMotionDirectionState()
    const first = cartesianToMotionAngles([2, 0, 0], directionState)
    const next = cartesianToMotionAngles([0, 3, 0], directionState)
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }],
          motion: [
            { beats: 1, plane: first[0], arc: first[1], distance: first[2] },
            { beats: 1 },
            { plane: next[0], arc: next[1], distance: next[2] },
          ],
        },
      ],
    }
    await nextTick()

    const properties = usePropertiesStore(storeId)
    properties.pFRAMES = 'motion'
    properties.pMOVENEXT = true
    player.PLAYING = false
    await nextTick()

    const nextBefore = [...runtime.COMPILED.value.props[0]!.motion[2]!.move]
    useProperties(storeId).motionSet('movexyzpreserve', [0, 0, -4])
    await nextTick()

    const compiled = runtime.COMPILED.value.props[0]!.motion
    expect(compiled[0]!.move).toEqual([0, 0, -4])
    expect(compiled[1]).toMatchObject({ distance: 0, active: false })
    compiled[2]!.move.forEach((coordinate, index) =>
      expect(coordinate).toBeCloseTo(nextBefore[index]!, 6),
    )
  })

  it('hydrates only the documented editor preferences', () => {
    localStorage.setItem(
      'sa-properties-editor-persisted',
      JSON.stringify({
        pBOUND: false,
        pMULTI: true,
        pDESKTOP: { root: [] },
        pFRAMES: 'motion',
        pSELECTED: { 4: true },
        pMOVENEXT: true,
      }),
    )
    activatePersistedPinia()

    const store = usePropertiesStore('editor-persisted')

    expect(store.pBOUND).toBe(false)
    expect(store.pMULTI).toBe(true)
    expect(store.pDESKTOP.root).toEqual([])
    expect(store.pDESKTOP.anim).toEqual(['anim'])
    expect(store.pDESKTOP.settings).toEqual(['settings'])
    expect(store.pSELECTED).toEqual({ 0: true })
    expect(store.pFRAMES).toBe('animation')
    expect(store.pMOVENEXT).toBe(true)
  })
})
