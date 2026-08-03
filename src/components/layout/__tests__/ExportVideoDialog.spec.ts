import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ExportVideoDialog from '@/components/layout/ExportVideoDialog.vue'
import type { VideoExportCodec } from '@/services/videoExportSupport'
import type { VideoExportProbeSettings } from '@/services/videoExportSupport'

const probe = vi.hoisted(() =>
  vi.fn<(settings: VideoExportProbeSettings) => Promise<VideoExportCodec[]>>(async () => [
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
    setActivePinia(createPinia())
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
      fileName: 'SpiroAnim',
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

  it('offers 120 and 240 FPS and probes the selected frame rate', async () => {
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    const framerate = wrapper.get<HTMLSelectElement>('[data-role="export-video-framerate"]')

    expect(framerate.findAll('option').map((option) => option.text())).toEqual([
      '30 FPS',
      '60 FPS',
      '120 FPS',
      '240 FPS',
    ])

    await framerate.setValue('240')
    await flushPromises()

    expect(probe).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 1280, height: 720, framerate: 240 }),
    )
    wrapper.unmount()
  })

  it('offers higher bitrates for reducing compression artifacts', async () => {
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    const quality = wrapper.get<HTMLSelectElement>('[data-role="export-video-quality"]')

    expect(quality.findAll('option').map((option) => option.text())).toEqual([
      'Standard',
      'High',
      'Very high',
      'Ultra',
      'Maximum',
    ])

    await quality.setValue('100000000')
    await flushPromises()

    expect(probe).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 1280, height: 720, bitrate: 100_000_000 }),
    )
    wrapper.unmount()
  })

  it('uses the last successfully exported file name', async () => {
    const wrapper = mount(ExportVideoDialog, { attachTo: document.body })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    const fileName = wrapper.get<HTMLInputElement>('[data-role="export-file-name"]')
    await fileName.setValue('Juggling <Final>')
    await wrapper.get('.export-button').trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({ fileName: 'Juggling Final' })

    await wrapper.vm.open(true, { width: 1280, height: 720 }, [16, 9])
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('[data-role="export-file-name"]').element.value).toBe(
      'Juggling Final',
    )
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
    expect(
      wrapper
        .findAll<HTMLInputElement>('.background-field input')
        .every((input) => !input.element.disabled),
    ).toBe(true)
    expect(wrapper.get('.background-field').text()).toContain('Transparency matte color')
    expect(wrapper.get('.background-field small').text()).toContain('choose a color similar')
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
