import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useSplitHandle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('starts mouse dragging when the TouchEvent constructor is unavailable', async () => {
    const touchEventDescriptor = Object.getOwnPropertyDescriptor(window, 'TouchEvent')
    Reflect.deleteProperty(window, 'TouchEvent')
    const emit = vi.fn<(event: 'perc', value: number) => void>()

    try {
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

            return () => h('button', { ref: element, onMousedown: dragStart })
          },
        }),
      )
      await nextTick()

      await wrapper.get('button').trigger('mousedown', { clientX: 100, clientY: 50 })
      document.dispatchEvent(new MouseEvent('mouseup'))

      expect(emit).toHaveBeenCalledWith('perc', 50)
      wrapper.unmount()
    } finally {
      if (touchEventDescriptor) {
        Object.defineProperty(window, 'TouchEvent', touchEventDescriptor)
      }
    }
  })
})
