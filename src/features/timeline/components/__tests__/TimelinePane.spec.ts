import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TimelinePane from '@/features/timeline/components/TimelinePane.vue'
import { useTimelinePaneStore } from '@/features/timeline/stores/useTimelinePaneStore'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { usePlayerStore } from '@/stores/usePlayerStore'

class FakeResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

const PlayerStub = {
  template: '<div />',
}

const TimelineStub = {
  props: ['cols'],
  emits: ['quickSlotApply', 'quickSlotSave'],
  template:
    '<div :data-cols="cols"><button data-role="apply" @click="$emit(\'quickSlotApply\', \'/time-vtg\')" /><button data-role="save" @click="$emit(\'quickSlotSave\', 2)" /></div>',
}

const PaneSwapButtonStub = {
  props: ['label'],
  emits: ['click'],
  template: '<button :aria-label="label" @click="$emit(\'click\')" />',
}

const mountTimelinePane = (playerVisible = false) =>
  mount(TimelinePane, {
    props: {
      dim: { width: 600, height: 700, perc: 50 },
      playerVisible,
    },
    global: {
      stubs: {
        Player: PlayerStub,
        Timeline: TimelineStub,
        PaneSplitter: { template: '<div data-role="splitter-timeline" />' },
        PaneSwapButton: PaneSwapButtonStub,
      },
    },
  })

describe('TimelinePane', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('defaults the mini-player above the timeline and swaps the views', async () => {
    const wrapper = mountTimelinePane()
    await flushPromises()

    const topPane = wrapper.get('[data-role="timeline-top-pane"]')
    const bottomPane = wrapper.get('[data-role="timeline-bottom-pane"]')
    expect(
      wrapper
        .get('[data-role="timeline-mini-player"]')
        .element.closest('[data-role="timeline-top-pane"]'),
    ).toBe(topPane.element)
    expect(
      wrapper
        .get('[data-role="timeline-content"]')
        .element.closest('[data-role="timeline-bottom-pane"]'),
    ).toBe(bottomPane.element)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBe('4')

    await wrapper.get('button[aria-label="Swap Timeline Views"]').trigger('click')
    await flushPromises()

    expect(useTimelinePaneStore().parents).toEqual({ player: 'bottom', timeline: 'top' })
    expect(
      wrapper
        .get('[data-role="timeline-mini-player"]')
        .element.closest('[data-role="timeline-bottom-pane"]'),
    ).toBe(bottomPane.element)
  })

  it('removes the mini-player when the main Player is visible and restores the split', async () => {
    const wrapper = mountTimelinePane()
    await flushPromises()

    await wrapper.setProps({ playerVisible: true })
    await flushPromises()

    expect(wrapper.find('[data-role="timeline-mini-player"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBeUndefined()
    expect(wrapper.find('button[aria-label="Swap Timeline Views"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="splitter-timeline"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="timeline-bottom-pane"]').attributes('style')).toContain(
      'flex: 0 0 100%',
    )

    await wrapper.setProps({ playerVisible: false })
    await flushPromises()

    expect(wrapper.find('[data-role="timeline-mini-player"]').exists()).toBe(true)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBe('4')
    expect(wrapper.find('button[aria-label="Swap Timeline Views"]').exists()).toBe(true)
    expect(wrapper.find('[data-role="splitter-timeline"]').exists()).toBe(true)
  })

  it('forwards Timeline Quick Slot events', async () => {
    const wrapper = mountTimelinePane()
    await flushPromises()

    await wrapper.get('[data-role="apply"]').trigger('click')
    await wrapper.get('[data-role="save"]').trigger('click')

    expect(wrapper.emitted('quickSlotApply')).toEqual([['/time-vtg']])
    expect(wrapper.emitted('quickSlotSave')).toEqual([[2]])
  })

  it('owns the Show Full Timeline control', async () => {
    const wrapper = mountTimelinePane()
    const playerStore = usePlayerStore('main')
    const propertiesStore = usePropertiesStore('main')
    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(false)

    useEditorAccessStore().editorLoaded = true
    await flushPromises()
    playerStore.ETIMES = [-1]
    await flushPromises()

    const showAll = wrapper.get('button[aria-label="Show Full Timeline"]')
    await showAll.trigger('click')

    expect(propertiesStore.showFullTimeline).toBe(true)
    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(false)
  })
})
