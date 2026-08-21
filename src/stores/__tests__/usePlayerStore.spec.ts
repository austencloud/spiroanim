import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlayerStore } from '@/stores/usePlayerStore'

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
    expect(store.PROGRESSIVE_PATHS).toBe(true)
    expect(store.ASPECT).toEqual([16, 9])
    expect(store.CANVAS_DIM).toEqual({ width: 0, height: 0 })
    expect(store.raw().COMPILED.value).toMatchObject({
      bpm: 120,
      camera: [{ center: { offset: [0, 0, 0] }, orbit: { offset: [0, 0, -22] } }],
      props: [],
    })
  })

  it('updates timing, selection bounds, and the active index when root data changes', async () => {
    const store = usePlayerStore('test-timing')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
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

  it('recompiles playback after an in-place root edit triggers its shallow ref', async () => {
    const store = usePlayerStore('test-in-place-playback')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }], motion: [] }],
    }
    await nextTick()

    runtime.ROOT.value.props[0]!.anim[0]!.beats = 2
    triggerRef(runtime.ROOT)
    await nextTick()

    expect(runtime.COMPILED.value.props[0]!.anim[0]!.beats).toBe(2)
    expect(runtime.PLAYBACK_COMPILED.value.props[0]!.anim[0]!.beats).toBe(2)
    expect(store.PTIMES).toEqual([[0, 2000]])
    expect(store.PLAYBACK_MAX).toBe(2000)
  })

  it('extends playback to the longer Motion track', async () => {
    const store = usePlayerStore('test-motion-timing')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [
        {
          anim: [{ beats: 1 }, { beats: 1 }],
          motion: [{ beats: 1 }, { beats: 1 }, { beats: 1 }, { beats: 1 }],
        },
      ],
    }
    await nextTick()

    expect(store.PTIMES).toEqual([[0, 1000]])
    expect(store.MTIMES).toEqual([[0, 1000, 2000, 3000]])
    expect(store.UTIMES).toEqual([0, 1000, 2000, 3000])
    expect(store.MAX).toBe(3000)
  })

  it('extends playback to the longer Camera track', async () => {
    const store = usePlayerStore('test-camera-timing')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      camera: [
        { orbit: { beats: 1 }, center: {} },
        { orbit: { beats: 1 }, center: {} },
        { orbit: {}, center: {} },
      ],
      props: [{ anim: [{ beats: 1 }, {}], motion: [] }],
    }
    await nextTick()

    expect(store.CTIMES).toEqual([0, 1000, 2000])
    expect(store.UTIMES).toEqual([0, 1000, 2000])
    expect(store.MAX).toBe(2000)
  })

  it('temporarily plays an override and points back to the latest root when cleared', async () => {
    const store = usePlayerStore('test-playback-override')
    const runtime = store.raw()
    const initialRoot = runtime.ROOT.value
    const override = {
      ...initialRoot,
      bpm: 60,
      aspectx: 4,
      aspecty: 3,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
    }

    store.setPlaybackOverride(override)
    await nextTick()

    expect(store.PLAYBACK_OVERRIDE_ACTIVE).toBe(true)
    expect(store.PLAYBACK_ROOT).toBe(override)
    expect(runtime.ROOT.value).toBe(initialRoot)
    expect(runtime.COMPILED.value.props).toEqual([])
    expect(runtime.PLAYBACK_COMPILED.value.props).toHaveLength(1)
    expect(store.PLAYBACK_MAX).toBe(2000)
    expect(store.PLAYBACK_ASPECT).toEqual([4, 3])

    const latestRoot = { ...initialRoot, bpm: 90 }
    runtime.ROOT.value = latestRoot
    await nextTick()
    expect(store.PLAYBACK_ROOT).toBe(override)

    store.clearPlaybackOverride()
    await nextTick()

    expect(store.PLAYBACK_OVERRIDE_ACTIVE).toBe(false)
    expect(store.PLAYBACK_ROOT).toBe(latestRoot)
    expect(runtime.PLAYBACK_COMPILED.value.bpm).toBe(90)
  })

  it('keeps preview playback independent from loaded ROOT playback', async () => {
    const store = usePlayerStore('test-playback-preview')
    const runtime = store.raw()
    const firstPreview = { ...runtime.ROOT.value, bpm: 60 }
    const secondPreview = { ...runtime.ROOT.value, bpm: 90 }
    expect(store.PREVIEW_PLAYING).toBe(true)
    store.PLAYING = true
    store.PREVIEW_PLAYING = false
    runtime.CURRENT.value = 750

    store.startPlaybackPreview(firstPreview)
    expect(store.PLAYBACK_PREVIEW_ACTIVE).toBe(true)
    expect(store.PLAYBACK_ROOT).toBe(firstPreview)
    expect(store.PLAYING).toBe(true)
    expect(store.PREVIEW_PLAYING).toBe(false)
    expect(runtime.CURRENT.value).toBe(0)

    store.startPlaybackPreview(secondPreview)
    expect(store.PLAYBACK_ROOT).toBe(secondPreview)
    expect(store.PREVIEW_PLAYING).toBe(false)

    runtime.CURRENT.value = 500
    store.endPlaybackPreview()
    await nextTick()

    expect(store.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(store.PLAYBACK_OVERRIDE_ACTIVE).toBe(false)
    expect(store.PLAYING).toBe(true)
    expect(store.PREVIEW_PLAYING).toBe(false)
    expect(runtime.CURRENT.value).toBe(0)
  })

  it('loads the original settings key without restoring legacy ORBIT data', () => {
    localStorage.setItem(
      'sa-player-test-load',
      JSON.stringify({
        PLAYING: false,
        TRACER: true,
        PROGRESSIVE_PATHS: false,
        freeCamera: true,
        ORBIT: { position: [1, 2, 3], target: [4, 5, 6] },
      }),
    )

    const store = usePlayerStore('test-load')

    expect(store.PLAYING).toBe(false)
    expect(store.TRACER).toBe(true)
    expect(store.PROGRESSIVE_PATHS).toBe(false)
    expect(store.freeCamera).toBe(true)
  })

  it('manually saves Player display settings after the debounce', async () => {
    vi.useFakeTimers()
    const store = usePlayerStore('test-save')

    store.PLAYING = false
    store.TRACER = true
    store.PROGRESSIVE_PATHS = true
    store.freeCamera = true
    await nextTick()

    expect(localStorage.getItem('sa-player-test-save')).toBeNull()
    await vi.advanceTimersByTimeAsync(100)
    expect(JSON.parse(localStorage.getItem('sa-player-test-save')!)).toEqual({
      PLAYING: false,
      TRACER: true,
      PROGRESSIVE_PATHS: true,
      freeCamera: true,
    })
  })
})
