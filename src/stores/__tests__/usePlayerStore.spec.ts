import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { ORIGRADIUS, RADIUS } from '@/domain/animation/AnimStruct'

describe('usePlayerStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => vi.useRealTimers())

  it('compiles its initial root and exposes player defaults', () => {
    const store = usePlayerStore('test-defaults')

    expect(store.PLAYING).toBe(true)
    expect(store.TRACER).toBe(false)
    expect(store.ASPECT).toEqual([16, 9])
    expect(store.CANVAS_DIM).toEqual({ width: 0, height: 0 })
    expect(store.raw().COMPILED.value).toMatchObject({ bpm: 120, props: [] })
  })

  it('updates timing, selection bounds, and the active index when root data changes', async () => {
    const store = usePlayerStore('test-timing')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }] }],
    }
    await nextTick()

    expect(store.PTIMES).toEqual([[0, 1000, 2000]])
    expect(store.UTIMES).toEqual([0, 1000, 2000])
    expect(store.MAX).toBe(2000)
    expect(store.COUNT).toBe(2)

    runtime.CURRENT.value = 1500
    await nextTick()
    expect(store.INDEX).toBe(1)
  })

  it('recenters the shared orbit when distance changes without a mounted player', async () => {
    const store = usePlayerStore('test-camera-centering')
    const runtime = store.raw()
    const initialRequest = store.cameraCenter
    const initialOrbit = runtime.ORBIT.value

    runtime.ROOT.value = { ...runtime.ROOT.value, thick: 8 }
    await nextTick()
    expect(store.cameraCenter).toBe(initialRequest)
    expect(runtime.ORBIT.value).toBe(initialOrbit)

    runtime.ROOT.value = { ...runtime.ROOT.value, distance: 30 }
    await nextTick()
    expect(store.cameraCenter).not.toBe(initialRequest)
    expect(runtime.ORBIT.value).toEqual({
      position: [0, 0, (-30 * RADIUS) / ORIGRADIUS],
      target: [0, 0, 0],
    })
  })

  it('loads the original settings key including legacy ORBIT data', () => {
    localStorage.setItem(
      'sa-player-test-load',
      JSON.stringify({
        PLAYING: false,
        TRACER: true,
        ORBIT: { position: [1, 2, 3], target: [4, 5, 6] },
      }),
    )

    const store = usePlayerStore('test-load')

    expect(store.PLAYING).toBe(false)
    expect(store.TRACER).toBe(true)
    expect(store.raw().ORBIT.value).toEqual({ position: [1, 2, 3], target: [4, 5, 6] })
  })

  it('manually saves only PLAYING and TRACER after the debounce', async () => {
    vi.useFakeTimers()
    const store = usePlayerStore('test-save')

    store.PLAYING = false
    store.TRACER = true
    await nextTick()

    expect(localStorage.getItem('sa-player-test-save')).toBeNull()
    await vi.advanceTimersByTimeAsync(100)
    expect(JSON.parse(localStorage.getItem('sa-player-test-save')!)).toEqual({
      PLAYING: false,
      TRACER: true,
    })
  })
})
