import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BasePopupMenu from '@/components/ui/BasePopupMenu.vue'

describe('BasePopupMenu', () => {
  it('opens, updates its model, and labels the menu from its trigger', async () => {
    const wrapper = mount(BasePopupMenu, {
      props: { 'onUpdate:open': (open: boolean) => wrapper.setProps({ open }) },
      slots: {
        trigger: 'Menu',
        default: '<a href="/first" role="menuitem">First</a>',
      },
    })
    const trigger = wrapper.get('button')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="menu"]').attributes('aria-labelledby')).toBe(
      trigger.attributes('id'),
    )
    expect(wrapper.emitted('update:open')).toEqual([[true]])
  })

  it('supports keyboard opening, movement, and dismissal', async () => {
    const wrapper = mount(BasePopupMenu, {
      attachTo: document.body,
      slots: {
        trigger: 'Menu',
        default:
          '<a href="/first" role="menuitem">First</a><a href="/second" role="menuitem">Second</a>',
      },
    })
    const trigger = wrapper.get('button')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent?.trim()).toBe('First')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent?.trim()).toBe('Second')

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)

    wrapper.unmount()
  })
})
