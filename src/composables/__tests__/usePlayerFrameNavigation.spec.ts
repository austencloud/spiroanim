import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { usePlayerFrameNavigation } from '@/composables/usePlayerFrameNavigation'
import { usePlayerStore } from '@/stores/usePlayerStore'

describe('usePlayerFrameNavigation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('moves backward and forward using the existing frame-edge behavior', () => {
    const playerStore = usePlayerStore('frame-navigation')
    const { CURRENT } = playerStore.raw()
    const { rewind, forward } = usePlayerFrameNavigation('frame-navigation')
    playerStore.ETIMES = [0, 10, 20]
    CURRENT.value = 15

    rewind()
    expect(CURRENT.value).toBe(10)

    forward()
    expect(CURRENT.value).toBe(19)
  })

  it('grows the active selection when navigating outward from either endpoint', () => {
    const playerStore = usePlayerStore('selection-navigation')
    const { CURRENT } = playerStore.raw()
    const { rewind, forward } = usePlayerFrameNavigation('selection-navigation')
    playerStore.ETIMES = [0, 10, 20, 30]
    playerStore.SELECTION = true
    playerStore.SELECTED = [1, 2]

    CURRENT.value = 10
    rewind()
    expect(playerStore.SELECTED).toEqual([0, 2])
    expect(CURRENT.value).toBe(0)

    CURRENT.value = 19
    forward()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(20)
  })

  it('keeps selection growth within the timeline bounds', () => {
    const playerStore = usePlayerStore('bounded-selection-navigation')
    const { CURRENT } = playerStore.raw()
    const { rewind, forward } = usePlayerFrameNavigation('bounded-selection-navigation')
    playerStore.ETIMES = [0, 10, 20, 30]
    playerStore.SELECTION = true
    playerStore.SELECTED = [0, 3]

    CURRENT.value = 0
    rewind()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(0)

    CURRENT.value = 29
    forward()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(29)
  })

  it('navigates with override timings while preview playback owns the Player', async () => {
    const playerStore = usePlayerStore('preview-frame-navigation')
    const { ROOT, CURRENT } = playerStore.raw()
    playerStore.ETIMES = [0, 10, 20]
    playerStore.setPlaybackOverride(
      {
        ...ROOT.value,
        bpm: 60,
        props: [{ anim: [{ beats: 2 }, { beats: 2 }, { beats: 2 }], motion: [] }],
      },
      true,
    )
    await nextTick()
    const { rewind, forward } = usePlayerFrameNavigation('preview-frame-navigation')
    CURRENT.value = 2500

    rewind()
    expect(CURRENT.value).toBe(2000)

    forward()
    expect(CURRENT.value).toBe(3999)
  })
})
