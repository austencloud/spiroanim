import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AppTooltip from '@/components/AppTooltip.vue'
import QuickSlotsControl from '@/features/concepts/components/QuickSlotsControl.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

describe('QuickSlotsControl', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useConceptsStore().restoreQuickSlots()
  })
  afterEach(() => vi.restoreAllMocks())

  it('starts with four slots and grows or shrinks the radio group', async () => {
    const wrapper = mount(QuickSlotsControl)
    const store = useConceptsStore()

    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4)
    expect(wrapper.get<HTMLInputElement>('input[value="1"]').element.checked).toBe(false)
    expect(wrapper.get('legend').text()).toBe('Quick Slots')
    expect(wrapper.get('[data-role="quick-slot-remove"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-role="quick-slot-add"]').trigger('click')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(5)

    await wrapper.get<HTMLInputElement>('input[value="5"]').setValue()
    expect(store.selectedQuickSlot).toBe(5)

    await wrapper.get('[data-role="quick-slot-remove"]').trigger('click')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4)
    expect(store.selectedQuickSlot).toBe(4)
    expect(wrapper.get<HTMLInputElement>('input[value="4"]').element.checked).toBe(true)

    await wrapper.get('[data-role="quick-slot-remove"]').trigger('click')
    await wrapper.get('[data-role="quick-slot-remove"]').trigger('click')
    await wrapper.get('[data-role="quick-slot-remove"]').trigger('click')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(1)
    await wrapper.get('[data-role="quick-slot-remove"]').trigger('click')
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
  })

  it('clears an already selected slot and leaves saving disabled', async () => {
    const store = useConceptsStore()
    store.selectedQuickSlot = 1
    const wrapper = mount(QuickSlotsControl)

    await wrapper.get<HTMLInputElement>('input[value="1"]').trigger('click')

    expect(store.selectedQuickSlot).toBeNull()
    expect(
      wrapper
        .findAll<HTMLInputElement>('input[type="radio"]')
        .map((input) => input.element.checked),
    ).toEqual([false, false, false, false])

    store.saveCurrentQuickSlot('/play-vtg?r=ignored&v=6')
    expect(store.quickSlotPaths).toEqual([null, null, null, null])
  })

  it('emits a stored path when a different Quick Slot is selected', async () => {
    const wrapper = mount(QuickSlotsControl)
    const store = useConceptsStore()
    store.quickSlotPaths[1] = '/play-8stp?r=stored&v=6'

    await wrapper.get<HTMLInputElement>('input[value="2"]').setValue()

    expect(store.selectedQuickSlot).toBe(2)
    expect(wrapper.emitted('apply')).toEqual([['/play-8stp?r=stored&v=6']])
  })

  it('provides desktop tooltips for every Quick Slot control', () => {
    const wrapper = mount(QuickSlotsControl)

    expect(wrapper.findAllComponents(AppTooltip).map((tooltip) => tooltip.props('text'))).toEqual([
      'Remove a Quick Slot',
      'Select Quick Slot 1',
      'Select Quick Slot 2',
      'Select Quick Slot 3',
      'Select Quick Slot 4',
      'Add a Quick Slot',
    ])
    expect(
      wrapper.findAllComponents(AppTooltip).every((tooltip) => !tooltip.props('disabled')),
    ).toBe(true)
  })

  it('balances many Quick Slots across rows like QST pagination', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.matches('button, .quick-slots__option') ? 32 : 0
    })
    useConceptsStore().quickSlotCount = 14

    const wrapper = mount(QuickSlotsControl)
    await nextTick()

    const rows = wrapper.findAll('[data-role="quick-slots-row"]')
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.findAll('input[name="quick-slot"]').length)).toEqual([5, 5, 4])
    expect(rows[0]?.find('[data-role="quick-slot-remove"]').exists()).toBe(true)
    expect(rows.at(-1)?.find('[data-role="quick-slot-add"]').exists()).toBe(true)
  })

  it('disables every Quick Slot tooltip on touch devices', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)')

    const wrapper = mount(QuickSlotsControl)

    expect(
      wrapper.findAllComponents(AppTooltip).every((tooltip) => tooltip.props('disabled')),
    ).toBe(true)
  })
})
