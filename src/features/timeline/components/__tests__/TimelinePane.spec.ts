import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TimelinePane from '@/features/timeline/components/TimelinePane.vue'
import { useTimelinePaneStore } from '@/features/timeline/stores/useTimelinePaneStore'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import {
  PANE_ADJACENT_CONTROL_START_INSET,
  PANE_CORNER_CONTROL_CLEARANCE,
  PANE_CORNER_CONTROL_START_INSET,
  PANE_CYCLE_CONTROL_START_CLEARANCE,
} from '@/components/layout/paneControlLayout'

class FakeResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
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

const AnimPlayerStub = {
  props: ['controlsStartClearance', 'controlsEndClearance', 'conceptsVisible'],
  template:
    '<div data-role="player-view" :controls-start-clearance="controlsStartClearance" :controls-end-clearance="controlsEndClearance" :concepts-visible="conceptsVisible">Player</div>',
}

const mountTimelinePane = (playerVisible = false, paneCycleControlsVisible = true) =>
  mount(TimelinePane, {
    props: {
      dim: { width: 600, height: 700, perc: 50 },
      playerVisible,
      paneCycleControlsVisible,
    },
    global: {
      stubs: {
        Timeline: TimelineStub,
        Player: AnimPlayerStub,
        AnimPlayer: AnimPlayerStub,
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

  it('defaults the full Player above the timeline and swaps the views', async () => {
    const wrapper = mountTimelinePane()
    await flushPromises()

    const topPane = wrapper.get('[data-role="timeline-top-pane"]')
    const bottomPane = wrapper.get('[data-role="timeline-bottom-pane"]')
    expect(
      wrapper
        .get('[data-role="timeline-player-host"]')
        .element.closest('[data-role="timeline-top-pane"]'),
    ).toBe(topPane.element)
    expect(
      wrapper
        .get('[data-role="timeline-content"]')
        .element.closest('[data-role="timeline-bottom-pane"]'),
    ).toBe(bottomPane.element)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBe('4')
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-end-clearance')).toBe(
      '0px',
    )
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-start-clearance')).toBe(
      '0px',
    )
    expect(wrapper.get('[data-role="timeline-player-host"]').attributes('style')).toContain(
      '--space-pane-bottom-offset: var(--space-pane-switch-bottom)',
    )
    expect(wrapper.get('[data-role="timeline-content-host"]').attributes('style')).toContain(
      '--space-pane-bottom-offset: var(--space-workspace-bottom-offset)',
    )

    await wrapper.get('button[aria-label="Swap Timeline Views"]').trigger('click')
    await flushPromises()

    expect(useTimelinePaneStore().parents).toEqual({ player: 'bottom', timeline: 'top' })
    expect(
      wrapper
        .get('[data-role="timeline-player-host"]')
        .element.closest('[data-role="timeline-bottom-pane"]'),
    ).toBe(bottomPane.element)
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-end-clearance')).toBe(
      PANE_CORNER_CONTROL_CLEARANCE,
    )
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-start-clearance')).toBe(
      PANE_CYCLE_CONTROL_START_CLEARANCE,
    )
    expect(wrapper.get('[data-role="timeline-player-host"]').attributes('style')).toContain(
      '--space-pane-bottom-offset: var(--space-workspace-bottom-offset)',
    )
    expect(wrapper.get('[data-role="timeline-content-host"]').attributes('style')).toContain(
      '--space-pane-bottom-offset: var(--space-pane-switch-bottom)',
    )
  })

  it('reserves both footer controls when the top Player expands over a hidden bottom pane', async () => {
    const wrapper = mountTimelinePane()
    useSplitterStore('timeline', 'top', 'bottom').topPerc = 100
    await flushPromises()

    expect(wrapper.get('[data-role="timeline-bottom-pane"]').isVisible()).toBe(false)
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-start-clearance')).toBe(
      PANE_CYCLE_CONTROL_START_CLEARANCE,
    )
    expect(wrapper.get('[data-role="player-view"]').attributes('controls-end-clearance')).toBe(
      PANE_CORNER_CONTROL_CLEARANCE,
    )
    expect(wrapper.get('[data-role="timeline-player-host"]').attributes('style')).toContain(
      '--space-pane-bottom-offset: var(--space-workspace-bottom-offset)',
    )
  })

  it('removes the embedded Player when the main Player is visible and restores the split', async () => {
    const wrapper = mountTimelinePane()
    await flushPromises()

    await wrapper.setProps({ playerVisible: true })
    await flushPromises()

    expect(wrapper.find('[data-role="timeline-player-host"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBeUndefined()
    expect(wrapper.find('button[aria-label="Swap Timeline Views"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="splitter-timeline"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="timeline-bottom-pane"]').attributes('style')).toContain(
      'flex: 0 0 100%',
    )

    await wrapper.setProps({ playerVisible: false })
    await flushPromises()

    expect(wrapper.find('[data-role="timeline-player-host"]').exists()).toBe(true)
    expect(wrapper.get('[data-role="timeline-content"]').attributes('data-cols')).toBe('4')
    expect(wrapper.find('button[aria-label="Swap Timeline Views"]').exists()).toBe(true)
    expect(wrapper.find('[data-role="splitter-timeline"]').exists()).toBe(true)
  })

  it('passes opposing Concepts visibility to its embedded Player', async () => {
    const wrapper = mountTimelinePane()
    await wrapper.setProps({ conceptsVisible: true })

    expect(wrapper.get('[data-role="player-view"]').attributes('concepts-visible')).toBe('true')
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
    expect(showAll.element.closest('[data-role="timeline-content-host"]')).not.toBeNull()
    expect((showAll.element as HTMLElement).style.left).toBe(PANE_ADJACENT_CONTROL_START_INSET)

    await wrapper.get('button[aria-label="Swap Timeline Views"]').trigger('click')
    await flushPromises()

    expect(showAll.element.closest('[data-role="timeline-top-pane"]')).not.toBeNull()
    expect((showAll.element as HTMLElement).style.left).toBe(PANE_CORNER_CONTROL_START_INSET)

    useSplitterStore('timeline', 'top', 'bottom').topPerc = 100
    await flushPromises()

    expect((showAll.element as HTMLElement).style.left).toBe(PANE_ADJACENT_CONTROL_START_INSET)

    await showAll.trigger('click')

    expect(propertiesStore.showFullTimeline).toBe(true)
    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(false)
  })

  it('only reserves the Timeline start corner when the pane-cycle control is visible', async () => {
    const wrapper = mountTimelinePane(false, false)
    useEditorAccessStore().editorLoaded = true
    await flushPromises()
    usePlayerStore('main').ETIMES = [-1]
    await flushPromises()

    const showAll = wrapper.get('button[aria-label="Show Full Timeline"]')
    expect((showAll.element as HTMLElement).style.left).toBe(PANE_CORNER_CONTROL_START_INSET)

    await wrapper.setProps({ paneCycleControlsVisible: true })
    await flushPromises()

    expect((showAll.element as HTMLElement).style.left).toBe(PANE_ADJACENT_CONTROL_START_INSET)
  })
})
