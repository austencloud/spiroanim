import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import PropertyPanel from '@/features/editor/components/properties/PropertyPanel.vue'
import AdvancedPanel from '@/features/editor/components/properties/panels/AdvancedPanel.vue'
import AnimationsPanel from '@/features/editor/components/properties/panels/AnimationsPanel.vue'
import MotionPathPanel from '@/features/editor/components/properties/panels/MotionPathPanel.vue'
import RootPanel from '@/features/editor/components/properties/panels/RootPanel.vue'
import SettingsPanel from '@/features/editor/components/properties/panels/SettingsPanel.vue'
import type { DynamicVal } from '@/types/AnimTypes'

describe('editor property panel organization', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  const propertyNames = (component: Component, store: string, props?: Record<string, unknown>) => {
    const wrapper = shallowMount(component, {
      props,
      global: { provide: { store: ref(store) } },
    })
    const vals = wrapper.getComponent(PropertyPanel).props('vals') as DynamicVal[]
    const names = vals.map(({ name }) => name)
    wrapper.unmount()
    return names
  }

  it('keeps Arc first in Animation followed by the rotational controls', () => {
    expect(propertyNames(AnimationsPanel, 'animation-panel-order')).toEqual([
      'arc',
      'turns',
      'plane',
      'axis',
      'adjust',
      'scale',
      'depth',
    ])
  })

  it('moves the remaining animation controls into Advanced', () => {
    expect(propertyNames(AdvancedPanel, 'advanced-panel-order')).toEqual([
      'point',
      'path',
      'direct',
      'beats',
      'type',
    ])
  })

  it('keeps the independent Motion controls in their intended order', () => {
    expect(propertyNames(MotionPathPanel, 'motion-panel-order')).toEqual([
      'beats',
      'precision',
      'move',
      'arc',
      'plane',
      'distance',
      'shape',
      'axis',
      'amount',
    ])
  })

  it('puts Camera Beats in Orbit and omits it from Center', () => {
    expect(propertyNames(MotionPathPanel, 'orbit-panel-order', { path: 'orbit' })[0]).toBe('beats')
    expect(
      propertyNames(MotionPathPanel, 'center-panel-order', {
        path: 'center',
        showBeats: false,
      }),
    ).not.toContain('beats')
    expect(propertyNames(MotionPathPanel, 'orbit-precision', { path: 'orbit' })).toContain(
      'precision',
    )
    expect(
      propertyNames(MotionPathPanel, 'center-precision', { path: 'center', showBeats: false }),
    ).toContain('precision')
  })

  it('moves global numeric controls from Root into Settings', () => {
    expect(propertyNames(RootPanel, 'root-panel-order')).toEqual([
      'paths',
      'hands',
      'travel',
      'arms',
      'visible',
      'nodes',
      'anchors',
      'guides',
      'prop',
      'color',
    ])
    expect(propertyNames(SettingsPanel, 'settings-panel-order')).toEqual([
      'bpm',
      'aspectx',
      'aspecty',
      'thick',
    ])
  })

  it('preserves help content for every settings control', () => {
    const wrapper = shallowMount(SettingsPanel, {
      global: { provide: { store: ref('settings-panel-tooltips') } },
    })
    const slots = wrapper.getComponent(PropertyPanel).vm.$slots

    expect(Object.keys(slots)).toEqual(
      expect.arrayContaining(['bpm', 'aspectx', 'aspecty', 'thick']),
    )
    wrapper.unmount()
  })
})
