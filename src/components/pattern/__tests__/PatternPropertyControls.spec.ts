import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PatternPropertyControls from '@/components/pattern/PatternPropertyControls.vue'

describe('PatternPropertyControls', () => {
  it('identifies its host context and starts collapsed', () => {
    const wrapper = mount(PatternPropertyControls, { props: { context: 'vtg' } })
    const properties = wrapper.get<HTMLDetailsElement>('[data-role="vtg-properties"]')

    expect(properties.attributes('data-context')).toBe('vtg')
    expect(properties.element.open).toBe(false)
    expect(wrapper.get('[data-role="vtg-properties-toggle"]').text()).toBe('PROPERTIES...')
  })

  it('shows only the selected property controls and allows them to collapse', async () => {
    const wrapper = mount(PatternPropertyControls, { props: { context: 'vtg' } })
    await wrapper.get('[data-role="vtg-properties-toggle"]').trigger('click')
    const axis = wrapper.get('[data-role="vtg-property-axis-toggle"]')
    const twist = wrapper.get('[data-role="vtg-property-twist-toggle"]')
    const turns = wrapper.find('[data-role="vtg-property-turns-toggle"]')

    expect([axis.text(), twist.text()]).toEqual(['Axis', 'Twist - For Roll-Sensitive Props'])
    expect(turns.exists()).toBe(false)
    expect(axis.attributes('aria-expanded')).toBe('false')

    await axis.trigger('click')
    expect(axis.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-role="vtg-property-axis-controls"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-role="vtg-property-axis-controls"]').text()).toBe(
      'Axis controls will go here.',
    )

    await twist.trigger('click')
    expect(axis.attributes('aria-expanded')).toBe('false')
    expect(twist.attributes('aria-expanded')).toBe('true')
    expect(
      wrapper.get<HTMLElement>('[data-role="vtg-property-axis-controls"]').element.style.display,
    ).toBe('none')
    expect(wrapper.get('[data-role="vtg-property-twist-controls"]').isVisible()).toBe(true)

    await twist.trigger('click')
    expect(twist.attributes('aria-expanded')).toBe('false')
    expect(
      wrapper.get<HTMLElement>('[data-role="vtg-property-twist-controls"]').element.style.display,
    ).toBe('none')
  })

  it('supports the future Builder context without VTG-specific selectors', () => {
    const wrapper = mount(PatternPropertyControls, { props: { context: 'builder' } })

    expect(wrapper.find('[data-role="vtg-properties"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="builder-properties"]').attributes('data-context')).toBe(
      'builder',
    )
    expect(wrapper.get('[data-role="builder-property-axis-toggle"]').text()).toBe('Axis')
    expect(wrapper.find('[data-role="builder-property-turns-toggle"]').exists()).toBe(false)
  })

  it.each(['vtg', 'builder'] as const)(
    'shows Turns in %s only when future 0:0 host logic explicitly enables it',
    (context) => {
      const wrapper = mount(PatternPropertyControls, {
        props: { context, showTurns: true },
      })

      expect(wrapper.get(`[data-role="${context}-property-turns-toggle"]`).text()).toBe('Turns')
    },
  )
})
