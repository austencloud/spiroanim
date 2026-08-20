import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DecimalTextForm from '@/features/editor/components/properties/forms/DecimalTextForm.vue'
import type { SetterFunc } from '@/types/AnimTypes'

describe('DecimalTextForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('accepts signed tenths and uses a decimal keyboard', async () => {
    const setter = vi.fn<SetterFunc>()
    const wrapper = mount(DecimalTextForm, {
      props: {
        data: [12, true, '12', false],
        vals: { name: 'turns', neg: true, float: 10 },
        setter,
      },
      global: { provide: { store: ref('decimal-text-form') } },
    })
    const input = wrapper.get<HTMLInputElement>('input')

    expect(input.attributes('inputmode')).toBe('decimal')
    expect(input.element.value).toBe('12')

    await input.setValue('12.5')
    expect(setter).toHaveBeenLastCalledWith('turns', 12.5)

    await input.setValue('-.5')
    expect(setter).toHaveBeenLastCalledWith('turns', -0.5)
  })

  it('rounds excess precision to the nearest tenth', async () => {
    const setter = vi.fn<SetterFunc>()
    const wrapper = mount(DecimalTextForm, {
      props: {
        data: [0, true, '0', false],
        vals: { name: 'turns', neg: true, float: 10 },
        setter,
      },
      global: { provide: { store: ref('decimal-text-rounding') } },
    })

    await wrapper.get('input').setValue('-1.26')
    expect(setter).toHaveBeenLastCalledWith('turns', -1.3)
  })
})
