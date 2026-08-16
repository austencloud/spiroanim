import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import DeleteProps from '@/features/editor/components/properties/manage/DeleteProps.vue'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { RootData } from '@/types/AnimTypes'

describe('DeleteProps', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('confirms deletion and can suppress later confirmations until remount', async () => {
    const storeId = 'delete-props-confirmation'
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
      props: [{ anim: [{ arc: 45 }] }, { anim: [{ arc: 90 }] }],
      aspectx: 1,
      aspecty: 1,
      distance: 22,
      thick: 4,
    } satisfies RootData)
    player.PLAYING = false

    const properties = usePropertiesStore(storeId)
    properties.pSELECTED = { 0: true, 1: false }
    await nextTick()

    const wrapper = mount(DeleteProps, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')

    const dialog = wrapper.get('dialog')
    expect((dialog.element as HTMLDialogElement).open).toBe(true)
    expect(dialog.text()).toContain('Are you sure?')
    expect(ROOT.value.props).toHaveLength(2)

    await wrapper.get('.delete-confirmation__cancel').trigger('click')
    expect(ROOT.value.props).toHaveLength(2)

    await wrapper.get('a').trigger('click')
    await wrapper.get('.delete-confirmation__choice input').setValue(true)
    await wrapper.get('.delete-confirmation__proceed').trigger('click')
    await nextTick()

    expect(ROOT.value.props).toHaveLength(1)
    expect(ROOT.value.props[0]!.anim[0]).toMatchObject({ arc: 90 })
    expect(properties.pSELECTED).toEqual({ 0: true })

    await wrapper.get('a').trigger('click')
    expect((dialog.element as HTMLDialogElement).open).toBe(false)
    expect(ROOT.value.props).toHaveLength(0)
  })
})
