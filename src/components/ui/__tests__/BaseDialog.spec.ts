import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BaseDialog from '@/components/ui/BaseDialog.vue'

describe('BaseDialog', () => {
  it('renders reusable dialog content with accessible title and close controls', async () => {
    const wrapper = mount(BaseDialog, {
      props: {
        modelValue: true,
        title: 'Example Dialog',
      },
      slots: {
        default: '<p class="example-content">Reusable content</p>',
      },
    })

    await nextTick()
    await nextTick()

    const dialog = wrapper.get('dialog')
    const title = wrapper.get('h2')
    expect(dialog.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(dialog.attributes()).toHaveProperty('open')
    expect(title.text()).toBe('Example Dialog')
    expect(wrapper.get('.example-content').text()).toBe('Reusable content')
    expect(wrapper.get('.base-dialog__close').attributes('aria-label')).toBe('Close dialog')

    await dialog.trigger('close')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })
})
