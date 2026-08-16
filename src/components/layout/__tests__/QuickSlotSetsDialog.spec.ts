import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import QuickSlotSetsDialog from '@/components/layout/QuickSlotSetsDialog.vue'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'

describe('QuickSlotSetsDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('explains when Quick Slots are disabled and prevents saving', async () => {
    const wrapper = mount(QuickSlotSetsDialog, { attachTo: document.body })
    wrapper.vm.open()
    await nextTick()

    expect(wrapper.get('[role="status"]').text()).toBe("Quick Slots aren't currently enabled.")
    expect(wrapper.get('[data-role="quick-slot-set-name"]').element).toHaveProperty(
      'value',
      'Quick Slot Set #1',
    )
    expect(wrapper.findAll('.quick-slot-sets__actions button')[1]?.attributes()).toHaveProperty(
      'disabled',
    )
    expect(wrapper.get('.quick-slot-sets__delete').attributes()).toHaveProperty('disabled')
    wrapper.unmount()
  })

  it('saves a new set, remembers it for overwrite, and loads its snapshot', async () => {
    const store = useConceptsStore()
    store.restoreQuickSlots()
    store.quickSlotPaths[0] = '/play-vtg?r=first&v=6'
    const wrapper = mount(QuickSlotSetsDialog, { attachTo: document.body })
    wrapper.vm.open()
    await nextTick()

    await wrapper.findAll('.quick-slot-sets__actions button')[1]!.trigger('click')
    expect(store.quickSlotSets[0]).toMatchObject({
      id: 'quick-slot-set-1',
      name: 'Quick Slot Set #1',
    })
    expect(store.selectedQuickSlotSetId).toBe('quick-slot-set-1')
    expect(
      wrapper.get<HTMLSelectElement>('[data-role="quick-slot-set-select"]').element.value,
    ).toBe('quick-slot-set-1')
    expect(wrapper.findAll('.quick-slot-sets__actions button')[1]?.attributes()).toHaveProperty(
      'disabled',
    )

    const secondId = store.saveNewQuickSlotSet('Other Set')
    await nextTick()
    await wrapper.get<HTMLSelectElement>('[data-role="quick-slot-set-select"]').setValue(secondId)
    expect(wrapper.get<HTMLInputElement>('[data-role="quick-slot-set-name"]').element.value).toBe(
      'Other Set',
    )
    store.deleteQuickSlotSet(secondId)
    await wrapper
      .get<HTMLSelectElement>('[data-role="quick-slot-set-select"]')
      .setValue('quick-slot-set-1')

    store.quickSlotPaths[0] = '/play-vtg?r=updated&v=6'
    await wrapper.get<HTMLInputElement>('[data-role="quick-slot-set-name"]').setValue('Favorites')
    await wrapper.findAll('.quick-slot-sets__actions button')[2]!.trigger('click')
    expect(store.quickSlotSets[0]).toMatchObject({ name: 'Favorites' })
    expect(wrapper.get('.quick-slot-sets__delete').text()).toBe('Delete')

    store.quickSlotPaths[0] = '/play-vtg?r=current&v=6'
    await wrapper.findAll('.quick-slot-sets__actions button')[0]!.trigger('click')
    expect(store.quickSlotPaths[0]).toBe('/play-vtg?r=updated&v=6')

    wrapper.vm.open()
    await nextTick()
    await wrapper.get('.quick-slot-sets__delete').trigger('click')
    expect(store.quickSlotSets).toHaveLength(1)
    expect(wrapper.get('.quick-slot-set-delete-dialog').attributes()).toHaveProperty('open')
    await wrapper
      .get<HTMLInputElement>('.quick-slot-set-delete-confirmation__choice input')
      .setValue(true)
    await wrapper.get('.quick-slot-set-delete-confirmation__confirm').trigger('click')
    expect(store.quickSlotSets).toEqual([])
    expect(store.quickSlotPaths[0]).toBe('/play-vtg?r=updated&v=6')
    expect(wrapper.get('.quick-slot-sets__delete').attributes()).toHaveProperty('disabled')

    store.saveNewQuickSlotSet('Delete Without Prompt')
    wrapper.vm.open()
    await nextTick()
    await wrapper.get('.quick-slot-sets__delete').trigger('click')
    expect(store.quickSlotSets).toEqual([])
    expect(wrapper.get('.quick-slot-set-delete-dialog').attributes('open')).toBeUndefined()
    wrapper.unmount()
  })
})
