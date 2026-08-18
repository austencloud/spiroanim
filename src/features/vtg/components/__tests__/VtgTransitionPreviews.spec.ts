import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  builderPatternPointerDropEvent,
  builderPatternPointerMoveEvent,
  createBuilderPatternPointerEvent,
} from '@/features/builder/patternPointerDrag'

const device = vi.hoisted(() => ({ touch: false }))
vi.mock('@/utils/device', () => ({ isTouchDevice: () => device.touch }))

const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
if (!animation) throw new Error('Expected a supported VTG pattern')

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

    expect(wrapper.emitted('patternPreview')).toEqual([[animation, 0]])
    expect(wrapper.get('.vtg-transition-previews__label').text()).toBe('TS/TS')
    expect(
      wrapper.get('button[aria-label="Preview pattern 1"]').attributes('aria-describedby'),
    ).toBeTruthy()
    expect(wrapper.get('button[aria-label="Preview pattern 1"]').attributes('draggable')).toBe(
      'false',
    )

    await wrapper.get('button[aria-label="Reverse direction of pattern 1"]').trigger('click')
    expect(wrapper.emitted('patternReverse')).toEqual([[0]])
    expect(wrapper.emitted('patternPreview')).toHaveLength(1)

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

  it('labels a half-beat thumbnail without changing the supplied animation', () => {
    const shortAnimation = {
      ...animation,
      props: animation.props.map((prop) => ({ ...prop, anim: prop.anim.slice(0, 2) })),
    }
    const wrapper = mount(VtgTransitionPreviews, {
      props: {
        animations: [shortAnimation],
        refreshKey: 'short-label',
        initialBeatCounts: [0.5],
        beatCounts: [0.5],
        scale: 1,
      },
    })

    expect(wrapper.get('.vtg-transition-previews__label').text()).toMatch(/^[TSQ][SO]\/[TSQ][SO]$/)
    expect(shortAnimation.props.every((prop) => prop.anim.length === 2)).toBe(true)
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
    expect(wrapper.get('[data-role="vtg-pattern-pointer-drag"]').text()).toBe('1-1')

    document.dispatchEvent(
      createBuilderPatternPointerEvent(builderPatternPointerDropEvent, {
        clientX: 10,
        clientY: 10,
        selection,
      }),
    )
    await nextTick()
    expect(wrapper.emitted('patternDrop')).toEqual([[{ previewIndex: 0, selection }]])
    expect(wrapper.find('[data-role="vtg-pattern-pointer-drag"]').exists()).toBe(false)

    Reflect.deleteProperty(document, 'elementFromPoint')
    wrapper.unmount()
  })
})
