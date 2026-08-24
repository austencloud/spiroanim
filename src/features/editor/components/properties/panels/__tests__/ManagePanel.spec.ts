import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ManagePanel from '@/features/editor/components/properties/panels/ManagePanel.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { RootData } from '@/types/AnimTypes'

describe('ManagePanel', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows and explains only the actions supported by the selected frame set', async () => {
    const storeId = 'manage-panel-tooltips'
    const player = usePlayerStore(storeId)
    const { ROOT } = player.raw()
    ROOT.value = rootFinal({
      bpm: 120,
      prop: 0,
      color: 0,
      smooth: true,
      guides: false,
      paths: true,
      hands: true,
      arms: false,
      visible: true,
      nodes: false,
      anchors: false,
      props: [{ anim: [{}], motion: [{}] }],
      aspectx: 1,
      aspecty: 1,
      distance: 22,
      thick: 4,
    } satisfies RootData)
    player.PLAYING = false
    const properties = usePropertiesStore(storeId)
    await nextTick()

    const wrapper = mount(ManagePanel, {
      global: {
        provide: { store: ref(storeId) },
        stubs: {
          PropertyPanel: { template: '<section><slot /></section>' },
        },
      },
    })

    const expected = [
      'Insert Points',
      'Shift',
      'Delete Selection',
      'Add Prop',
      'Delete Props',
      'Double Frames',
      'Halve Frames',
      'Compress',
    ]
    const links = wrapper.findAll('a')
    expect(links.map((link) => link.text())).toEqual(expected)
    expect(wrapper.get('.manage-note').text()).toBe(
      'Manage tools are limited and still in development.',
    )

    for (const [index, text] of expected.entries()) {
      await links[index]!.trigger('mouseenter')
      vi.advanceTimersByTime(0)
      await nextTick()
      expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain(text)
      await links[index]!.trigger('mouseleave')
      await nextTick()
    }

    properties.pFRAMES = 'motion'
    await nextTick()

    const motionExpected = ['Insert Frame', 'Delete Selection', 'Compress']
    const motionLinks = wrapper.findAll('a')
    expect(motionLinks.map((link) => link.text())).toEqual(motionExpected)

    for (const [index, text] of motionExpected.entries()) {
      await motionLinks[index]!.trigger('mouseenter')
      vi.advanceTimersByTime(0)
      await nextTick()
      expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain(text)
      await motionLinks[index]!.trigger('mouseleave')
      await nextTick()
    }

    ROOT.value.props[0]!.motion.splice(0)
    triggerRef(ROOT)
    await nextTick()
    expect(wrapper.findAll('a').map((link) => link.text())).toEqual(['Insert Frame', 'Compress'])

    properties.pFRAMES = 'camera'
    await nextTick()
    expect(wrapper.findAll('a').map((link) => link.text())).toEqual(['Insert Frame', 'Compress'])

    player.freeCamera = true
    await nextTick()
    expect(wrapper.findAll('a').map((link) => link.text())).toEqual([
      'Insert Frame',
      'Compress',
      'Match Free Camera',
    ])
    player.freeCameraPose = { position: [3, 0, -10], target: [3, 0, 0] }
    await nextTick()
    await wrapper
      .findAll('a')
      .find((link) => link.text() === 'Match Free Camera')!
      .trigger('click')
    await nextTick()
    expect(ROOT.value.camera[0]!.center?.distance).toBe(3)
    expect(ROOT.value.camera[0]!.orbit?.distance).toBe(10)

    ROOT.value.camera.push({ center: {}, orbit: {} })
    triggerRef(ROOT)
    await nextTick()
    expect(wrapper.findAll('a').map((link) => link.text())).toEqual([
      'Insert Frame',
      'Delete Selection',
      'Compress',
      'Match Free Camera',
    ])

    wrapper.unmount()
  })
})
