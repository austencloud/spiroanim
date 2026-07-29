import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import AppTooltip from '@/components/AppTooltip.vue'
import PlayerControls from '@/components/SpiroAnim/player/PlayerControls.vue'

describe('PlayerControls', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('describes the playback speed selector with a tooltip', () => {
    const wrapper = mount(PlayerControls, {
      props: { store: 'speed-tooltip' },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    const speedTooltip = wrapper
      .findAllComponents(AppTooltip)
      .find((tooltip) => tooltip.props('text') === 'Playback Speed')
    const select = wrapper.get('select[aria-label="Playback speed"]')

    expect(speedTooltip).toBeDefined()
    expect(select.attributes('aria-describedby')).toBeTruthy()

    wrapper.unmount()
  })

  it('keeps only Center Camera in the former right-side action stack', () => {
    const wrapper = mount(PlayerControls, {
      props: { store: 'right-side-actions' },
      global: {
        stubs: {
          BaseIcon: true,
          Progress: {
            template: '<div><slot name="play" /><slot name="mode" /></div>',
          },
        },
      },
    })

    expect(wrapper.find('.btnCenter').exists()).toBe(true)
    expect(wrapper.find('.btnTracer').exists()).toBe(false)
    expect(wrapper.find('.btnPicture').exists()).toBe(false)

    const tooltipText = wrapper
      .findAllComponents(AppTooltip)
      .map((tooltip) => tooltip.props('text'))
    expect(tooltipText).toContain('Center Camera')
    expect(tooltipText).not.toContain('Tracer Mode')
    expect(tooltipText).not.toContain('Export Image')

    wrapper.unmount()
  })
})
