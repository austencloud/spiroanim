import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import PlayerProgress from '@/components/SpiroAnim/player/PlayerProgress.vue'
import {
  PANE_CORNER_CONTROL_CLEARANCE,
  PANE_CYCLE_CONTROL_START_CLEARANCE,
} from '@/components/layout/paneControlLayout'
import { usePlayerStore } from '@/stores/usePlayerStore'

describe('PlayerProgress', () => {
  it('provides a centered compact layout that follows live player resizing', async () => {
    const dimensions = reactive({ width: 320, height: 180 })
    const wrapper = mount(PlayerProgress, {
      props: { store: 'progress-compact', compact: true },
      slots: {
        play: '<button>Play</button>',
        mode: '<button>Mode</button>',
        end: '<button>Free Camera</button>',
      },
      global: { provide: { dim: dimensions } },
    })

    expect(wrapper.get('.slider').classes()).toContain('slider--compact')
    expect(wrapper.text()).toContain('Play')
    expect(wrapper.text()).not.toContain('Mode')
    expect(wrapper.text()).toContain('Free Camera')
    expect((wrapper.get('.slider').element as HTMLElement).style.width).toBe('320px')
    expect((wrapper.get('.slider').element as HTMLElement).style.left).toBe('0px')
    expect(wrapper.findAll('.slider-control')).toHaveLength(2)

    dimensions.width = 480
    await nextTick()

    expect((wrapper.get('.slider').element as HTMLElement).style.width).toBe('480px')
  })

  it('reserves compact end space for an adjacent pane control', () => {
    const wrapper = mount(PlayerProgress, {
      props: {
        store: 'progress-compact-clearance',
        compact: true,
        endClearance: 'calc(var(--size-pane-switch-button) + var(--space-2))',
      },
      global: { provide: { dim: { width: 320, height: 180 } } },
    })
    const style = (wrapper.get('.slider').element as HTMLElement).style

    expect(style.width).toContain('320px')
    expect(style.width).toContain('var(--size-pane-switch-button)')
    expect(style.right).toBe('calc(var(--size-pane-switch-button) + var(--space-2))')
  })

  it('reserves full-control end space for a bottom-pane swap control', () => {
    const endClearance = PANE_CORNER_CONTROL_CLEARANCE
    const wrapper = mount(PlayerProgress, {
      props: { store: 'progress-full-clearance', endClearance },
      global: { provide: { dim: { width: 600, height: 400 } } },
    })
    const style = (wrapper.get('.slider').element as HTMLElement).style

    expect(style.width).toContain('600px')
    expect(style.width).toContain(PANE_CYCLE_CONTROL_START_CLEARANCE)
    expect(style.left).toBe(PANE_CYCLE_CONTROL_START_CLEARANCE)
    expect(style.right).toBe(endClearance)
  })

  it('reclaims the full start edge when no pane-cycle control is present', () => {
    const wrapper = mount(PlayerProgress, {
      props: { store: 'progress-no-start-clearance', startClearance: '0px' },
      global: { provide: { dim: { width: 600, height: 400 } } },
    })
    const style = (wrapper.get('.slider').element as HTMLElement).style

    expect(style.width).toBe('600px')
    expect(style.left).toBe('0px')
    expect(style.right).toBe('0px')
  })

  it('ignores active Selection and extends the track when Selection is disabled', () => {
    const store = usePlayerStore('progress-selection-disabled')
    store.SELECTION = true
    store.MAX = 2000
    const wrapper = mount(PlayerProgress, {
      props: { store: 'progress-selection-disabled', selectionEnabled: false },
      slots: { play: '<button>Play</button>', mode: '<button>Select</button>' },
      global: { provide: { dim: { width: 600, height: 400 } } },
    })

    expect(wrapper.get('.slider').classes()).toContain('slider--selection-disabled')
    expect(wrapper.find('input[aria-label="Animation position"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Selection start"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Select')
    expect(store.SELECTION).toBe(true)
  })

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function mountProgress(id: string) {
    return mount(PlayerProgress, {
      props: { store: id },
      global: {
        provide: {
          dim: { width: 600, height: 400 },
        },
      },
    })
  }

  it('keeps the draggable controls above the device safe area', () => {
    const wrapper = mountProgress('progress-safe-area')

    expect(wrapper.get('.slider').attributes('style')).toContain(
      'bottom: var(--space-pane-bottom-offset)',
    )
    expect(wrapper.get('.slider').attributes('style')).toContain(PANE_CYCLE_CONTROL_START_CLEARANCE)
  })

  it('updates the current position and reports the modification', async () => {
    const store = usePlayerStore('progress-position')
    store.MAX = 2000
    const update = store.UPDATE
    const wrapper = mountProgress('progress-position')
    const slider = wrapper.get<HTMLInputElement>('input[aria-label="Animation position"]')

    await slider.setValue(750)

    expect(store.raw().CURRENT.value).toBe(750)
    expect(store.UPDATE).not.toBe(update)
    expect(slider.attributes('max')).toBe('2000')
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineStart).toBe('0%')
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineEnd).toBe('62.5%')
  })

  it('applies a restored playback maximum before restoring its position', async () => {
    const store = usePlayerStore('progress-override-exit')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: Array.from({ length: 9 }, () => ({ beats: 1 })), motion: [] }],
    }
    await nextTick()
    store.setPlaybackOverride(
      {
        ...runtime.ROOT.value,
        props: [{ anim: [{ beats: 1 }, { beats: 1 }], motion: [] }],
      },
      true,
    )
    const wrapper = mountProgress('progress-override-exit')
    const slider = wrapper.get<HTMLInputElement>('input[aria-label="Animation position"]')

    expect(slider.element.max).toBe('1000')

    // Builder restores both values in one render when a shorter preview is deselected.
    // The range constraint must expand before the position is assigned or the browser clamps it.
    runtime.CURRENT.value = 4000
    store.clearPlaybackOverride()
    await nextTick()

    expect(slider.element.max).toBe('8000')
    expect(slider.element.value).toBe('4000')
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineEnd).toBe('50%')
  })

  it('pauses during interaction and resumes only when it was already playing', async () => {
    const store = usePlayerStore('progress-playback')
    const wrapper = mountProgress('progress-playback')
    const slider = wrapper.get('input[aria-label="Animation position"]')

    store.PLAYING = true
    await slider.trigger('pointerdown')
    expect(store.PLAYING).toBe(false)
    await slider.trigger('pointerup')
    expect(store.PLAYING).toBe(true)

    store.PLAYING = false
    await slider.trigger('pointerdown')
    await slider.trigger('pointerup')
    expect(store.PLAYING).toBe(false)
  })

  it('controls preview playback without changing loaded ROOT playback', async () => {
    const store = usePlayerStore('progress-preview-playback')
    store.PLAYING = true
    store.PREVIEW_PLAYING = false
    store.setPlaybackOverride(store.raw().ROOT.value, true)
    const wrapper = mount(PlayerProgress, {
      props: { store: 'progress-preview-playback' },
      global: { provide: { dim: { width: 600, height: 400 } } },
    })
    const slider = wrapper.get('input[aria-label="Animation position"]')

    await slider.trigger('pointerdown')
    await slider.trigger('pointerup')
    expect(store.PREVIEW_PLAYING).toBe(false)
    expect(store.PLAYING).toBe(true)

    store.PLAYING = false
    store.PREVIEW_PLAYING = true
    await slider.trigger('pointerdown')
    expect(store.PREVIEW_PLAYING).toBe(false)
    expect(store.PLAYING).toBe(false)
    await slider.trigger('pointerup')
    expect(store.PREVIEW_PLAYING).toBe(true)
    expect(store.PLAYING).toBe(false)
  })

  it('does not treat a claimed global shortcut as progress interaction', () => {
    const store = usePlayerStore('progress-global-shortcut')
    const wrapper = mountProgress('progress-global-shortcut')
    const slider = wrapper.get('input[aria-label="Animation position"]')
    store.PLAYING = true
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
    event.preventDefault()

    slider.element.dispatchEvent(event)

    expect(store.PLAYING).toBe(true)
  })

  it('uses frame indices in selection mode and preserves the endpoint timing rule', async () => {
    const store = usePlayerStore('progress-selection')
    store.ETIMES = [0, 1000, 2000]
    store.COUNT = 2
    store.SELECTED = [0, 1]
    store.SELECTION = true
    const wrapper = mountProgress('progress-selection')
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Selection start"]')
    const end = wrapper.get<HTMLInputElement>('input[aria-label="Selection end"]')

    expect(end.attributes('max')).toBe('2')

    await end.setValue(2)
    expect(store.SELECTED).toEqual([0, 2])
    expect(store.raw().CURRENT.value).toBe(1999)

    await start.setValue(1)
    expect(store.SELECTED).toEqual([1, 2])
    expect(store.raw().CURRENT.value).toBe(1000)
  })

  it('uses override frame timings while selection mode controls preview playback', async () => {
    const store = usePlayerStore('progress-preview-selection')
    const runtime = store.raw()
    runtime.ROOT.value = {
      ...runtime.ROOT.value,
      bpm: 60,
      props: [{ anim: [{ beats: 1 }, { beats: 1 }, { beats: 1 }], motion: [] }],
    }
    store.ETIMES = [0, 1000, 2000]
    store.setPlaybackOverride(
      {
        ...runtime.ROOT.value,
        props: [{ anim: [{ beats: 2 }, { beats: 2 }], motion: [] }],
      },
      true,
    )
    store.SELECTED = [0, 0]
    store.SELECTION = true
    await nextTick()

    const wrapper = mountProgress('progress-preview-selection')
    const end = wrapper.get<HTMLInputElement>('input[aria-label="Selection end"]')

    expect(end.attributes('max')).toBe('1')
    await end.setValue(1)
    expect(runtime.CURRENT.value).toBe(1999)
  })

  it('fills only the selected range and allows the handles to cross', async () => {
    const store = usePlayerStore('progress-selection-crossing')
    store.ETIMES = [0, 1000, 2000, 3000, 4000]
    store.COUNT = 4
    store.SELECTED = [1, 3]
    store.SELECTION = true
    const wrapper = mountProgress('progress-selection-crossing')
    const fill = wrapper.get<HTMLElement>('.selection-fill')
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Selection start"]')

    expect(fill.element.style.insetInlineStart).toBe('25%')
    expect(fill.element.style.insetInlineEnd).toBe('25%')

    await start.trigger('pointerdown')
    await start.setValue(4)
    expect(store.SELECTED).toEqual([3, 4])
    expect(start.element.value).toBe('4')

    await start.trigger('pointerup')
    expect(start.element.value).toBe('3')
    expect(fill.element.style.insetInlineStart).toBe('75%')
    expect(fill.element.style.insetInlineEnd).toBe('0%')
  })

  it('keeps the stationary handle in place when the end handle crosses it', async () => {
    const store = usePlayerStore('progress-end-crossing')
    store.ETIMES = [0, 1000, 2000, 3000, 4000]
    store.COUNT = 4
    store.SELECTED = [1, 3]
    store.SELECTION = true
    const wrapper = mountProgress('progress-end-crossing')
    const start = wrapper.get<HTMLInputElement>('input[aria-label="Selection start"]')
    const end = wrapper.get<HTMLInputElement>('input[aria-label="Selection end"]')

    // Thumb identity must not depend on separate pointer event bookkeeping.
    await end.setValue(0)

    expect(store.SELECTED).toEqual([0, 1])
    expect(start.element.value).toBe('1')
    expect(end.element.value).toBe('0')
  })

  it('synchronizes its handles when selection mode mutates the range in place', async () => {
    const store = usePlayerStore('progress-mode-switch')
    store.ETIMES = [0, 1000, 2000, 3000, 4000]
    store.COUNT = 4
    const wrapper = mountProgress('progress-mode-switch')

    store.SELECTION = true
    store.SELECTED[0] = 2
    store.SELECTED[1] = 4
    await nextTick()

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Selection start"]').element.value).toBe(
      '2',
    )
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Selection end"]').element.value).toBe(
      '4',
    )
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineStart).toBe('50%')
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineEnd).toBe('0%')

    store.SELECTION = false
    await nextTick()
    store.SELECTION = true
    store.SELECTED[0] = 1
    store.SELECTED[1] = 2
    await nextTick()

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Selection start"]').element.value).toBe(
      '1',
    )
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Selection end"]').element.value).toBe(
      '2',
    )
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineStart).toBe('25%')
    expect(wrapper.get<HTMLElement>('.selection-fill').element.style.insetInlineEnd).toBe('50%')
  })
})
