import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import { rootFinal } from '@/math/animation/PlayerFunc'

const animation = rootFinal({
  bpm: 120,
  prop: 0,
  color: 0,
  guides: false,
  paths: true,
  travel: false,
  hands: true,
  arms: false,
  visible: true,
  nodes: true,
  anchors: true,
  smooth: true,
  props: [],
  aspectx: 16,
  aspecty: 9,
  distance: 22,
  thick: 4,
})

describe('VtgTransitionPreviews', () => {
  it('emits the exact thumbnail animation when its visual is clicked', async () => {
    const wrapper = mount(VtgTransitionPreviews, {
      props: {
        animations: [animation],
        refreshKey: 'test',
        initialBeatCounts: [1],
        beatCounts: [1],
        scale: 1,
      },
    })

    await wrapper.get('button[aria-label="Preview pattern 1"]').trigger('click')

    expect(wrapper.emitted('patternPreview')).toEqual([[animation]])

    await wrapper.get('button[aria-label="Delete pattern 1"]').trigger('click')
    expect(wrapper.emitted('patternDelete')).toEqual([[0]])
    expect(wrapper.emitted('patternPreview')).toHaveLength(1)
  })
})
