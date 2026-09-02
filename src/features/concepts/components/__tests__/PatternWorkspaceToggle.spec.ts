import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PatternWorkspaceToggle from '@/features/concepts/components/PatternWorkspaceToggle.vue'

describe('PatternWorkspaceToggle', () => {
  it('renders its controlled state and emits toggle requests', async () => {
    const wrapper = mount(PatternWorkspaceToggle, {
      props: {
        label: 'Pattern Viewer',
        checked: true,
        controlRole: 'pattern-viewer',
      },
    })
    const input = wrapper.get<HTMLInputElement>('[data-role="pattern-viewer"]')

    expect(input.element.checked).toBe(true)
    expect(wrapper.text()).toBe('Pattern Viewer')

    await input.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('prevents interaction when disabled', async () => {
    const wrapper = mount(PatternWorkspaceToggle, {
      props: { label: 'Pattern Viewer', disabled: true },
    })
    const input = wrapper.get<HTMLInputElement>('input')

    expect(input.element.disabled).toBe(true)
    await input.trigger('click')
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })
})
