import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createPointerEvent = (
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  {
    clientX = 0,
    clientY = 0,
    pointerId,
  }: { clientX?: number; clientY?: number; pointerId: number },
) => {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY })
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: pointerId },
    pointerType: { value: 'mouse' },
  })
  return event
}

describe('useSplitHandle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('can load before the application installs Pinia', async () => {
    setActivePinia(undefined)

    await expect(import('@/composables/useSplitHandle')).resolves.toBeDefined()
  })

  it('keeps the complete vertical handle inside the parent boundary', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(32)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(32)
    const { useSplitHandle } = await import('@/composables/useSplitHandle')

    const wrapper = mount(
      defineComponent({
        setup() {
          const element = ref<HTMLElement>()
          const { iconStyle } = useSplitHandle({
            parent: ref({ width: 100, height: 100 }),
            object: ref({ width: 100, height: 100 }),
            landscape: ref(false),
            emit: () => undefined,
            element,
            iconMap: { vertical: '', horizontal: '', close: '' },
          })

          return () => h('button', { ref: element, style: iconStyle })
        },
      }),
    )
    await nextTick()

    const button = wrapper.get('button').element
    const center = Number.parseFloat(button.style.top)

    expect(center).toBe(84)
    expect(center + button.offsetHeight / 2).toBe(100)
  })

  it('handles mouse dragging through pointer events', async () => {
    const emit = vi.fn<(event: 'perc', value: number) => void>()

    const { useSplitHandle } = await import('@/composables/useSplitHandle')
    const wrapper = mount(
      defineComponent({
        setup() {
          const element = ref<HTMLElement>()
          const { dragStart } = useSplitHandle({
            parent: ref({ width: 200, height: 100 }),
            object: ref({ width: 100, height: 100 }),
            landscape: ref(true),
            emit,
            element,
            iconMap: { vertical: '', horizontal: '', close: '' },
          })

          return () => h('button', { ref: element, onPointerdown: dragStart })
        },
      }),
    )
    await nextTick()

    wrapper.get('button').element.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 7,
      }),
    )
    document.dispatchEvent(createPointerEvent('pointerup', { pointerId: 7 }))

    expect(emit).toHaveBeenCalledWith('perc', 50)
    wrapper.unmount()
  })

  it('finishes dragging when the active pointer is cancelled', async () => {
    const emit = vi.fn<(event: 'perc', value: number) => void>()
    const { useSplitHandle } = await import('@/composables/useSplitHandle')
    const wrapper = mount(
      defineComponent({
        setup() {
          const element = ref<HTMLElement>()
          const { dragStart } = useSplitHandle({
            parent: ref({ width: 200, height: 100 }),
            object: ref({ width: 100, height: 100 }),
            landscape: ref(true),
            emit,
            element,
            iconMap: { vertical: '', horizontal: '', close: '' },
          })

          return () => h('button', { ref: element, onPointerdown: dragStart })
        },
      }),
    )
    await nextTick()

    wrapper.get('button').element.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: 100,
        clientY: 50,
        pointerId: 9,
      }),
    )
    document.dispatchEvent(createPointerEvent('pointercancel', { pointerId: 9 }))

    expect(emit).toHaveBeenCalledWith('perc', 50)
    wrapper.unmount()
  })
})
