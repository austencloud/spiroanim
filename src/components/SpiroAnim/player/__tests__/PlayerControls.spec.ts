import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import AppTooltip from '@/components/AppTooltip.vue'
import PlayerControls from '@/components/SpiroAnim/player/PlayerControls.vue'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useQSMainStore } from '@/stores/useQSMainStore'

describe('PlayerControls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('describes the playback speed selector with a tooltip', () => {
    const wrapper = mount(PlayerControls, {
      props: { store: 'speed-tooltip' },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    const speedTooltip = wrapper
      .findAllComponents(AppTooltip)
      .find((tooltip) => tooltip.props('text') === 'Playback Speed')
    const select = wrapper.get('select[aria-label="Playback speed"]')

    expect(speedTooltip).toBeDefined()
    expect(select.attributes('aria-describedby')).toBeTruthy()

    wrapper.unmount()
  })

  it('exposes the persisted Free Camera toggle in the right-side action stack', async () => {
    const wrapper = mount(PlayerControls, {
      props: { store: 'right-side-actions' },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    expect(wrapper.find('.btnCenter').exists()).toBe(true)
    expect(wrapper.find('.btnTracer').exists()).toBe(false)
    expect(wrapper.find('.btnPicture').exists()).toBe(false)

    const tooltipText = wrapper
      .findAllComponents(AppTooltip)
      .map((tooltip) => tooltip.props('text'))
    expect(tooltipText).toContain('Free Camera')
    expect(tooltipText).not.toContain('Tracer Mode')
    expect(tooltipText).not.toContain('Export Image')

    const button = wrapper.get('button[aria-label="Free camera"]')
    expect(button.attributes('aria-pressed')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')

    wrapper.unmount()
  })

  it('hides and disables Selection when the Player does not support it', () => {
    const wrapper = mount(PlayerControls, {
      props: { store: 'selection-disabled', selectionEnabled: false },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            props: ['selectionEnabled'],
            template:
              '<div :data-selection-enabled="selectionEnabled"><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    expect(wrapper.find('button[aria-label="Select mode"]').exists()).toBe(false)
    expect(wrapper.get('[data-selection-enabled="false"]')).toBeDefined()
  })

  it('controls temporary preview playback and speed without changing loaded playback', async () => {
    const store = usePlayerStore('preview-safe-controls')
    const runtime = store.raw()
    const loadedSpeed = runtime.ROOT.value.speed
    store.PLAYING = false
    store.PREVIEW_PLAYING = false
    store.setPlaybackOverride({ ...runtime.ROOT.value, speed: 1 }, true)
    const wrapper = mount(PlayerControls, {
      props: { store: 'preview-safe-controls' },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    await wrapper.get('button[aria-label="Play"]').trigger('click')
    expect(store.PREVIEW_PLAYING).toBe(true)
    expect(store.PLAYING).toBe(false)

    await wrapper.get<HTMLSelectElement>('select[aria-label="Playback speed"]').setValue('0.5')
    expect(runtime.PLAYBACK_OVERRIDE.value?.speed).toBe(0.5)
    expect(runtime.ROOT.value.speed).toBe(loadedSpeed)
  })

  it('offers undo at the top right only while history exists and the Editor is hidden', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const playerStore = usePlayerStore('main')
    const { ROOT } = playerStore.raw()
    const originalBpm = ROOT.value.bpm
    const historyStore = useQSMainStore()
    historyStore.qsHistory = []
    historyStore.qsFuture = []
    historyStore.qsSkip = false

    historyStore.encodeQS(ROOT.value)
    ROOT.value = { ...ROOT.value, bpm: originalBpm + 10 }
    historyStore.encodeQS(ROOT.value)
    expect(historyStore.undoQS()?.bpm).toBe(originalBpm)
    expect(historyStore.redoQS()?.bpm).toBe(originalBpm + 10)

    const wrapper = mount(PlayerControls, {
      props: { store: 'main' },
      global: {
        plugins: [pinia],
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    expect(wrapper.get('.btnUndo button[aria-label="Undo"]').attributes('aria-label')).toBe('Undo')

    await wrapper.setProps({ editorVisible: true })
    expect(wrapper.find('button[aria-label="Undo"]').exists()).toBe(false)

    await wrapper.setProps({ editorVisible: false })
    await wrapper.get('button[aria-label="Undo"]').trigger('click')

    expect(ROOT.value.bpm).toBe(originalBpm)
    expect(historyStore.historyApplied?.action).toBe('undo')
    expect(wrapper.find('button[aria-label="Undo"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
