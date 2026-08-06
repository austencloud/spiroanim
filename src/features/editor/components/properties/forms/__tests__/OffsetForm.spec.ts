import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import OffsetForm from '@/features/editor/components/properties/forms/OffsetForm.vue'
import type { SetterFunc } from '@/types/AnimTypes'

describe('OffsetForm', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('edits whole-number Cartesian values and applies the persisted Preserve choice', async () => {
    const setter = vi.fn<SetterFunc>()
    const wrapper = mount(OffsetForm, {
      props: {
        data: [[10, 0, 0], true, '1.0, 0.0, 0.0', false],
        vals: { name: 'move' },
        setter,
      },
      global: { provide: { store: ref('offset-form') } },
    })

    expect(wrapper.text()).toContain('Preserve Next')
    expect(wrapper.findAll('.field span').map((label) => label.text())).toEqual([
      'Horizontal',
      'Vertical',
      'Depth',
    ])
    expect(wrapper.findAll<HTMLInputElement>('input[type="range"]')).toHaveLength(3)
    for (const slider of wrapper.findAll<HTMLInputElement>('input[type="range"]')) {
      expect(slider.attributes('min')).toBe('-10')
      expect(slider.attributes('max')).toBe('10')
      expect(slider.attributes('step')).toBe('1')
    }

    const textInputs = wrapper.findAll<HTMLInputElement>('input[inputmode="numeric"]')
    await textInputs[0]!.setValue('12.4')
    expect(setter).toHaveBeenLastCalledWith('movexyz', [12, 0, 0])

    await wrapper.get<HTMLInputElement>('.preserve-next input').setValue(true)
    await textInputs[1]!.setValue('3')
    expect(setter).toHaveBeenLastCalledWith('movexyzpreserve', [10, 3, 0])
  })
})
