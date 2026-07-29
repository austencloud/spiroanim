import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExportVideoDialog from '@/components/layout/ExportVideoDialog.vue'
import type { VideoExportCodec } from '@/services/videoExportSupport'

const probe = vi.hoisted(() =>
  vi.fn<() => Promise<VideoExportCodec[]>>(async () => [
    {
      codec: 'avc1.640028',
      container: 'mp4',
      label: 'H.264 (MP4)',
      supportsAlpha: false,
    },
  ]),
)

vi.mock('@/services/videoExportSupport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/videoExportSupport')>()),
  hasVideoExportApi: () => true,
  probeVideoExportCodecs: probe,
}))

describe('ExportVideoDialog', () => {
  beforeEach(() => {
    probe.mockClear()
  })

  it('emits the probed codec and selected rendering settings', async () => {
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    expect(wrapper.find('.alpha-field').exists()).toBe(false)
    const button = wrapper.get<HTMLButtonElement>('.export-button')
    expect(button.element.disabled).toBe(false)
    await button.trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({
      width: 1280,
      height: 720,
      framerate: 60,
      bitrate: 16_000_000,
      backgroundColor: '#090b0f',
      transparent: false,
      codec: 'avc1.640028',
      container: 'mp4',
    })
    wrapper.unmount()
  })

  it('offers experimental transparency only when the VP9 alpha probe succeeds', async () => {
    probe.mockResolvedValue([
      {
        codec: 'vp09.00.40.08',
        container: 'webm',
        label: 'VP9 (WebM)',
        supportsAlpha: true,
      },
    ])
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    const checkbox = wrapper.get<HTMLInputElement>('.alpha-field input')
    expect(checkbox.element.disabled).toBe(false)
    await checkbox.setValue(true)
    await wrapper.get('.export-button').trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({
      codec: 'vp09.00.40.08',
      container: 'webm',
      transparent: true,
    })
    wrapper.unmount()
  })

  it('remembers the selected resolution until the aspect ratio changes', async () => {
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    const resolution = wrapper.get<HTMLSelectElement>('select')
    await resolution.setValue('1920x1080')

    await wrapper.vm.open(true, { width: 960, height: 540 }, [16, 9])
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('1920x1080')

    await wrapper.vm.open(true, { width: 800, height: 600 }, [4, 3])
    await flushPromises()
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('800x600')
    wrapper.unmount()
  })
})
