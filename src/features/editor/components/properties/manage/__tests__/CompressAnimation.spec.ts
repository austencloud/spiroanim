import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import CompressAnimation from '@/features/editor/components/properties/manage/CompressAnimation.vue'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { usePlayerStore } from '@/stores/usePlayerStore'
import type { RootData } from '@/types/AnimTypes'

describe('CompressAnimation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('compresses while the animation is playing', async () => {
    const storeId = 'compress-while-playing'
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
      props: [{ prop: 0, anim: [{ beats: 1 }] }],
      aspectx: 1,
      aspecty: 1,
      distance: 22,
      thick: 4,
    } satisfies RootData)
    player.PLAYING = true

    const wrapper = mount(CompressAnimation, {
      global: { provide: { store: ref(storeId) } },
    })
    await wrapper.get('a').trigger('click')

    expect(ROOT.value.props[0]).toEqual({ anim: [{}], motion: [] })
  })
})
