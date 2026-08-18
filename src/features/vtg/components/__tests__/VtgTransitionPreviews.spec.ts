import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import { rootFinal } from '@/math/animation/PlayerFunc'
import {
  builderPatternPointerDropEvent,
  builderPatternPointerMoveEvent,
  createBuilderPatternPointerEvent,
} from '@/features/builder/patternPointerDrag'

const device = vi.hoisted(() => ({ touch: false }))
vi.mock('@/utils/device', () => ({ isTouchDevice: () => device.touch }))

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
  beforeEach(() => {
    device.touch = false
  })

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

  it('reveals only the tapped thumbnail delete control on touch devices', async () => {
    device.touch = true
    const wrapper = mount(VtgTransitionPreviews, {
      props: {
        animations: [animation, animation],
        refreshKey: 'touch-delete',
        initialBeatCounts: [1, 1],
        beatCounts: [1, 1],
        scale: 1,
      },
    })
    const previews = wrapper.findAll<HTMLButtonElement>('.vtg-transition-previews__visual')
    const items = wrapper.findAll('.vtg-transition-previews__item').slice(0, 2)

    await previews[0]!.trigger('click')
    expect(items[0]!.classes()).toContain('vtg-transition-previews__item--delete-revealed')

    await previews[1]!.trigger('click')
    expect(items[0]!.classes()).not.toContain('vtg-transition-previews__item--delete-revealed')
    expect(items[1]!.classes()).toContain('vtg-transition-previews__item--delete-revealed')

    await previews[1]!.trigger('click')
    expect(items[1]!.classes()).not.toContain('vtg-transition-previews__item--delete-revealed')
  })

  it('accepts a pointer drag drop on touch devices', async () => {
    device.touch = true
    const wrapper = mount(VtgTransitionPreviews, {
      attachTo: document.body,
      props: {
        animations: [animation],
        refreshKey: 'touch-drop',
        initialBeatCounts: [1],
        beatCounts: [1],
        scale: 1,
      },
    })
    const target = wrapper.get<HTMLElement>('[data-preview-index="0"]')
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn<() => Element>(() => target.element),
    })
    const selection = { reference: '1-1', speedRatio: '1:1' } as const

    document.dispatchEvent(
      createBuilderPatternPointerEvent(builderPatternPointerMoveEvent, {
        clientX: 10,
        clientY: 10,
        selection,
      }),
    )
    await nextTick()
    expect(target.classes()).toContain('vtg-transition-previews__item--drag-over')

    document.dispatchEvent(
      createBuilderPatternPointerEvent(builderPatternPointerDropEvent, {
        clientX: 10,
        clientY: 10,
        selection,
      }),
    )
    await nextTick()
    expect(wrapper.emitted('patternDrop')).toEqual([[{ previewIndex: 0, selection }]])

    Reflect.deleteProperty(document, 'elementFromPoint')
    wrapper.unmount()
  })
})
