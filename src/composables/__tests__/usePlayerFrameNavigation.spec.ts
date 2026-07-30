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
    playerStore.UTIMES = [0, 10, 20]
    playerStore.INDEX = 1
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
    playerStore.UTIMES = [0, 10, 20, 30]
    playerStore.SELECTION = true
    playerStore.SELECTED = [1, 2]

    playerStore.INDEX = 1
    CURRENT.value = 10
    rewind()
    expect(playerStore.SELECTED).toEqual([0, 2])
    expect(CURRENT.value).toBe(0)

    playerStore.INDEX = 1
    CURRENT.value = 19
    forward()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(20)
  })

  it('keeps selection growth within the timeline bounds', () => {
    const playerStore = usePlayerStore('bounded-selection-navigation')
    const { CURRENT } = playerStore.raw()
    const { rewind, forward } = usePlayerFrameNavigation('bounded-selection-navigation')
    playerStore.UTIMES = [0, 10, 20, 30]
    playerStore.SELECTION = true
    playerStore.SELECTED = [0, 3]

    playerStore.INDEX = 0
    CURRENT.value = 0
    rewind()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(0)

    playerStore.INDEX = 2
    CURRENT.value = 29
    forward()
    expect(playerStore.SELECTED).toEqual([0, 3])
    expect(CURRENT.value).toBe(29)
  })
})
