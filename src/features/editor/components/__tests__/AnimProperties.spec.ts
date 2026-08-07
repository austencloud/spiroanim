import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import AppTooltip from '@/components/AppTooltip.vue'
import AnimProperties from '@/features/editor/components/AnimProperties.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'

describe('AnimProperties', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('describes the editor toolbar controls with shared tooltips', () => {
    usePlayerStore('toolbar-tooltips').SELECTION = true
    const wrapper = mount(AnimProperties, {
      props: {
        dim: { width: 700, height: 400, perc: 60 },
        cols: 3,
        store: 'toolbar-tooltips',
      },
      global: {
        stubs: {
          Animations: true,
          Advanced: true,
          Root: true,
          Settings: true,
          Base: true,
          Manage: true,
          BaseIcon: true,
        },
      },
    })

    const tooltipText = wrapper
      .findAllComponents(AppTooltip)
      .map((tooltip) => tooltip.props('text'))
    expect(tooltipText).toEqual(
      expect.arrayContaining([
        'Back',
        'Forward',
        'Undo',
        'Position',
        'Modifying',
        'Select multiple props',
        'Only include props with points at both selection bounds',
      ]),
    )

    wrapper.unmount()
  })

  it('marks the toolbar for navigation clearance only when the editor is in the main left pane', async () => {
    const paneStore = useMainPaneStore()
    paneStore.setViewInPane('editor', 'left')

    const wrapper = mount(AnimProperties, {
      props: {
        dim: { width: 700, height: 400, perc: 60 },
        cols: 1,
        store: 'left-pane-clearance',
      },
      global: {
        stubs: {
          Animations: true,
          Advanced: true,
          Root: true,
          Settings: true,
          Base: true,
          Manage: true,
          BaseIcon: true,
        },
      },
    })

    expect(wrapper.get('.scrollbar').classes()).toContain('scrollbar--main-left')

    paneStore.setViewInPane('editor', 'right')
    await nextTick()

    expect(wrapper.get('.scrollbar').classes()).not.toContain('scrollbar--main-left')

    wrapper.unmount()
  })

  it('defaults to Animation and switches to the empty Motion frame set for the session', async () => {
    const storeId = 'frame-set-switcher'
    const { ROOT } = usePlayerStore(storeId).raw()
    const wrapper = mount(AnimProperties, {
      props: {
        dim: { width: 700, height: 400, perc: 60 },
        cols: 1,
        store: storeId,
      },
      global: {
        stubs: {
          Animations: true,
          Advanced: true,
          Root: true,
          Settings: true,
          Base: true,
          Manage: { template: '<div data-test="manage-pane" />' },
          Orbit: { template: '<div data-test="orbit-pane" />' },
          Center: { template: '<div data-test="center-pane" />' },
          BaseIcon: true,
        },
      },
    })

    const frameSet = wrapper.get<HTMLSelectElement>('select[aria-label="Frame set"]')
    expect(frameSet.element.value).toBe('animation')
    expect(frameSet.findAll('option').map((option) => option.text())).toEqual([
      'Animation',
      'Motion',
      'Camera',
    ])
    const selectionControls = wrapper.get('.selection-options').findAll('select, input')
    expect(selectionControls[0]!.element).toBe(frameSet.element)
    expect(selectionControls[1]!.attributes('type')).toBe('checkbox')

    await frameSet.setValue('motion')
    expect(usePropertiesStore(storeId).pFRAMES).toBe('motion')
    expect(wrapper.text()).toContain('No Motion frames')
    expect(wrapper.findAll('[data-test="manage-pane"]')).toHaveLength(0)

    ROOT.value.props.push({ anim: [{}], motion: [{}] })
    triggerRef(ROOT)
    await nextTick()
    expect(wrapper.findAll('.modifying-count')[1]!.text()).toBe('1')
    expect(wrapper.findAll('[data-test="manage-pane"]')).toHaveLength(1)

    usePropertiesStore(storeId).pSELECTED = { 0: false }
    await nextTick()
    expect(wrapper.findAll('[data-test="manage-pane"]')).toHaveLength(0)

    await frameSet.setValue('camera')
    expect(usePropertiesStore(storeId).pFRAMES).toBe('camera')
    expect(wrapper.get('.prop-cell').isVisible()).toBe(true)
    expect(wrapper.get('.prop-options').isVisible()).toBe(false)
    expect(wrapper.findAll('.modifying-count')[1]!.text()).toBe('1')
    expect(wrapper.findAll('[data-test="manage-pane"]')).toHaveLength(1)
    expect(
      wrapper
        .findAll('[data-test="orbit-pane"], [data-test="center-pane"]')
        .map((pane) => pane.attributes('data-test')),
    ).toEqual(['orbit-pane', 'center-pane'])

    usePropertiesStore(storeId).CAMERAS = []
    await nextTick()
    expect(wrapper.text()).toContain('No Camera frames')

    wrapper.unmount()
  })
})
