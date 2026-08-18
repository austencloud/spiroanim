import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import QuickSlotsAction from '@/features/concepts/components/QuickSlotsAction.vue'

describe('QuickSlotsAction', () => {
  const mountAction = (warningRequired = false) =>
    mount(QuickSlotsAction, {
      props: { warningRequired },
      global: { plugins: [createPinia()] },
    })

  it('emits immediately when replacement confirmation is not required', async () => {
    const wrapper = mountAction()

    await wrapper.get('[data-role="vtg-transition-qslots"]').trigger('click')

    expect(wrapper.emitted('qSlots')).toEqual([[]])
  })

  it('reuses the replacement prompt and can suppress later warnings', async () => {
    const wrapper = mountAction(true)
    const button = wrapper.get('[data-role="vtg-transition-qslots"]')

    await button.trigger('click')
    expect(wrapper.emitted('qSlots')).toBeUndefined()
    expect(wrapper.get<HTMLDialogElement>('.qslots-warning').attributes()).toHaveProperty('open')

    await wrapper.get<HTMLInputElement>('.qslots-warning__choice input').setValue(true)
    await wrapper.get('.qslots-warning__proceed').trigger('click')
    expect(wrapper.emitted('qSlots')).toEqual([[]])

    await button.trigger('click')
    expect(wrapper.emitted('qSlots')).toEqual([[], []])
  })
})
