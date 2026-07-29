import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExportVideoProgressDialog from '@/components/layout/ExportVideoProgressDialog.vue'

describe('ExportVideoProgressDialog', () => {
  it('shows frame progress and emits cancel', async () => {
    const wrapper = mount(ExportVideoProgressDialog, {
      attachTo: document.body,
      props: {
        status: 'rendering',
        progress: { completedFrames: 15, totalFrames: 60 },
        error: '',
      },
    })

    wrapper.vm.open()
    await nextTick()

    expect(wrapper.get('progress').attributes()).toMatchObject({
      max: '60',
      value: '15',
    })
    expect(wrapper.text()).toContain('Frame 15 of 60 (25%)')

    await wrapper.get('button:not(.base-dialog__close)').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })

  it('reports that a canceled export restored the player', async () => {
    const wrapper = mount(ExportVideoProgressDialog, {
      attachTo: document.body,
      props: {
        status: 'canceled',
        progress: { completedFrames: 2, totalFrames: 60 },
        error: '',
      },
    })

    wrapper.vm.open()
    await nextTick()

    expect(wrapper.text()).toContain('Video export canceled. The player has been restored.')
    expect(wrapper.get('button:not(.base-dialog__close)').text()).toBe('Close')
    wrapper.unmount()
  })
})
