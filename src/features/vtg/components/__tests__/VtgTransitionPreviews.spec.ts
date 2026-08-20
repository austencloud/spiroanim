import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppTooltip from '@/components/AppTooltip.vue'
import VtgTransitionPreviews from '@/features/vtg/components/VtgTransitionPreviews.vue'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { useViewportStore } from '@/stores/useViewportStore'
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
    setActivePinia(createPinia())
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
    expect(wrapper.emitted('selectionChange')).toEqual([[0]])
    expect(wrapper.get('.vtg-transition-previews__label').text()).toBe('TS / TS')
    expect(wrapper.get('.vtg-transition-previews__ratio').text()).toBe('1:3')
    expect(
      wrapper.get('button[aria-label="Preview pattern 1"]').attributes('aria-describedby'),
    ).toBeTruthy()
    expect(wrapper.get('button[aria-label="Preview pattern 1"]').attributes('draggable')).toBe(
      'false',
    )
    expect(wrapper.findAllComponents(AppTooltip).map((tooltip) => tooltip.props('text'))).toEqual([
      'Reverse',
      'Swap Props',
      'Delete',
    ])

    await wrapper.get('button[aria-label="Reverse direction of pattern 1"]').trigger('click')
    expect(wrapper.emitted('patternReverse')).toEqual([[0]])
    expect(wrapper.emitted('patternPreview')).toHaveLength(1)

    await wrapper.get('button[aria-label="Swap props in pattern 1"]').trigger('click')
    expect(wrapper.emitted('patternSwap')).toEqual([[0]])
    expect(wrapper.emitted('patternPreview')).toHaveLength(1)

    await wrapper.get('button[aria-label="Delete pattern 1"]').trigger('click')
    expect(wrapper.emitted('patternDelete')).toEqual([[0]])
    expect(wrapper.emitted('patternPreview')).toHaveLength(1)
  })

  it('shows the shared action tooltip when application tooltips are enabled', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgTransitionPreviews, {
      props: {
        animations: [animation],
        refreshKey: 'action-tooltip',
        initialBeatCounts: [1],
        beatCounts: [1],
        scale: 1,
        selectedIndex: 0,
      },
    })

    useViewportStore().showTooltips = true
    await nextTick()
    await wrapper.get('button[aria-label="Reverse direction of pattern 1"]').trigger('mouseenter')
    vi.advanceTimersByTime(0)
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('Reverse')
    wrapper.unmount()
    vi.useRealTimers()
  })

  it.each([false, true])('selects exactly one thumbnail when touch is %s', async (touch) => {
    device.touch = touch
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
    await wrapper.setProps({ selectedIndex: 0 })
    expect(items[0]!.classes()).toContain('vtg-transition-previews__item--selected')
    expect(wrapper.classes()).toContain('vtg-transition-previews--has-selection')
    expect(wrapper.find('[data-role="vtg-transition-preview-drop-target"]').exists()).toBe(false)

    await previews[1]!.trigger('click')
    await wrapper.setProps({ selectedIndex: 1 })
    expect(items[0]!.classes()).not.toContain('vtg-transition-previews__item--selected')
    expect(items[1]!.classes()).toContain('vtg-transition-previews__item--selected')

    await previews[1]!.trigger('click')
    expect(wrapper.emitted('selectionChange')).toEqual([[0], [1], [undefined]])
  })

  it('blocks the first insertion target until its thumbnail is selected', async () => {
    const wrapper = mount(VtgTransitionPreviews, {
      props: {
        animations: [animation, animation],
        refreshKey: 'drop-rules',
        initialBeatCounts: [1, 1],
        beatCounts: [1, 1],
        scale: 1,
      },
    })
    const items = wrapper.findAll('.vtg-transition-previews__item')
    const dataTransfer = {
      dropEffect: 'copy',
      getData: () => JSON.stringify({ reference: '1-1', speedRatio: '1:3' }),
    }

    await items[0]!.trigger('dragenter')
    expect(items[0]!.classes()).toContain('vtg-transition-previews__item--drop-blocked')
    await items[0]!.trigger('drop', { dataTransfer })
    expect(wrapper.emitted('patternDrop')).toBeUndefined()

    await wrapper.setProps({ selectedIndex: 0 })
    await items[0]!.trigger('dragenter')
    expect(items[0]!.classes()).toContain('vtg-transition-previews__item--drag-over')
    expect(items[0]!.classes()).not.toContain('vtg-transition-previews__item--drop-blocked')
    await items[0]!.trigger('drop', { dataTransfer })
    expect(wrapper.emitted('patternDrop')).toHaveLength(1)

    await items[1]!.trigger('dragenter')
    expect(items[1]!.classes()).toContain('vtg-transition-previews__item--drop-blocked')
    await items[1]!.trigger('drop', { dataTransfer })
    expect(wrapper.emitted('patternDrop')).toHaveLength(1)
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

    expect(wrapper.get('.vtg-transition-previews__label').text()).toMatch(
      /^[TSQ][SO] \/ [TSQ][SO]$/,
    )
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
        selectedIndex: 0,
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
