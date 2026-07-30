import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSpiroAnimKeyboard } from '@/composables/useSpiroAnimKeyboard'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'
import { useViewportStore } from '@/stores/useViewportStore'

describe('useSpiroAnimKeyboard', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    setActivePinia(createPinia())
    const history = useQSMainStore()
    history.qsHistory = []
    history.qsFuture = []
    history.qsSkip = false
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('undoes and redoes editor history with platform keyboard shortcuts', () => {
    const playerStore = usePlayerStore('main')
    const { ROOT } = playerStore.raw()
    const history = useQSMainStore()
    const original = structuredClone(ROOT.value)
    const changed = structuredClone(original)
    original.bpm = 60
    changed.bpm = 90
    history.encodeQS(original)
    history.encodeQS(changed)
    ROOT.value = changed
    expect(history.qsHistory).toHaveLength(2)
    expect(history.undoQS()?.bpm).toBe(60)
    expect(history.redoQS()?.bpm).toBe(90)

    vi.spyOn(useViewportStore(), 'isTouchDevice').mockReturnValue(false)
    stop = useSpiroAnimKeyboard()

    const vtgTile = document.createElement('button')
    document.body.append(vtgTile)
    const undoEvent = new KeyboardEvent('keydown', {
      code: 'KeyZ',
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
    })
    vtgTile.dispatchEvent(undoEvent)
    expect(undoEvent.defaultPrevented).toBe(true)
    expect(ROOT.value.bpm).toBe(60)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyZ',
        metaKey: true,
        shiftKey: true,
        cancelable: true,
      }),
    )
    expect(ROOT.value.bpm).toBe(90)

    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyZ', metaKey: true, cancelable: true }),
    )
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyY', ctrlKey: true, cancelable: true }),
    )
    expect(ROOT.value.bpm).toBe(90)

    const textInput = document.createElement('input')
    document.body.append(textInput)
    textInput.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'KeyZ',
        ctrlKey: true,
        cancelable: true,
        bubbles: true,
      }),
    )
    expect(ROOT.value.bpm).toBe(90)
    expect(history.qsHistory).toHaveLength(2)
  })

  it('toggles playback with Space on desktop', () => {
    const playerStore = usePlayerStore('main')
    playerStore.PLAYING = false
    vi.spyOn(useViewportStore(), 'isTouchDevice').mockReturnValue(false)
    stop = useSpiroAnimKeyboard()

    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(event)

    expect(playerStore.PLAYING).toBe(true)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not toggle playback on touch devices', () => {
    const playerStore = usePlayerStore('main')
    playerStore.PLAYING = false
    vi.spyOn(useViewportStore(), 'isTouchDevice').mockReturnValue(true)
    stop = useSpiroAnimKeyboard()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))

    expect(playerStore.PLAYING).toBe(false)
  })

  it('navigates frames with the left and right arrow keys', () => {
    const playerStore = usePlayerStore('main')
    const { CURRENT } = playerStore.raw()
    playerStore.UTIMES = [0, 10, 20]
    playerStore.INDEX = 1
    CURRENT.value = 15
    vi.spyOn(useViewportStore(), 'isTouchDevice').mockReturnValue(false)
    stop = useSpiroAnimKeyboard()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }))
    expect(CURRENT.value).toBe(10)

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))
    expect(CURRENT.value).toBe(19)
  })

  it('ignores Space from interactive controls and held-key repeats', () => {
    const playerStore = usePlayerStore('main')
    playerStore.PLAYING = false
    vi.spyOn(useViewportStore(), 'isTouchDevice').mockReturnValue(false)
    stop = useSpiroAnimKeyboard()

    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true }))

    expect(playerStore.PLAYING).toBe(false)
  })
})
