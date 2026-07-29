import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import ExportImageDialog from '@/components/layout/ExportImageDialog.vue'

describe('ExportImageDialog', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('exports PNG with the selected resolution and transparent background', async () => {
    const wrapper = mount(ExportImageDialog, { attachTo: document.body })

    wrapper.vm.open({ width: 1280, height: 720 }, [16, 9])
    await nextTick()
    await wrapper.get<HTMLSelectElement>('select').setValue('1920x1080')
    await wrapper.get('.export-button').trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toEqual({
      fileName: 'SpiroAnim',
      width: 1920,
      height: 1080,
      backgroundColor: '#090b0f',
      transparent: true,
      fileType: 'image/png',
      quality: 0.92,
      hiddenFeatures: [],
    })
    wrapper.unmount()
  })

  it('filters the file name and remembers it after a successful export', async () => {
    const wrapper = mount(ExportImageDialog, { attachTo: document.body })

    wrapper.vm.open({ width: 1280, height: 720 }, [16, 9])
    await nextTick()
    const fileName = wrapper.get<HTMLInputElement>('[data-role="export-file-name"]')
    await fileName.setValue('My: Spin/Pattern?.png')

    expect(fileName.element.value).toBe('My SpinPattern.png')
    await wrapper.get('.export-button').trigger('click')
    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({ fileName: 'My SpinPattern.png' })

    wrapper.vm.open({ width: 1280, height: 720 }, [16, 9])
    await nextTick()
    expect(wrapper.get<HTMLInputElement>('[data-role="export-file-name"]').element.value).toBe(
      'My SpinPattern.png',
    )
    wrapper.unmount()
  })

  it('offers enabled scene features and remembers which ones should be hidden', async () => {
    const wrapper = mount(ExportImageDialog, { attachTo: document.body })
    const features = {
      paths: true,
      hands: false,
      visible: true,
      nodes: false,
      anchors: true,
      guides: false,
    }

    wrapper.vm.open({ width: 1280, height: 720 }, [16, 9], features)
    await nextTick()
    expect(wrapper.findAll('.feature-options label').map((label) => label.text())).toEqual([
      'Paths',
      'Visible props',
      'Anchors',
    ])

    const checkboxes = wrapper.findAll<HTMLInputElement>('.feature-options input')
    await checkboxes[0]!.setValue(true)
    await checkboxes[2]!.setValue(true)

    wrapper.vm.open({ width: 960, height: 540 }, [16, 9], features)
    await nextTick()
    const remembered = wrapper.findAll<HTMLInputElement>('.feature-options input')
    expect(remembered.map((checkbox) => checkbox.element.checked)).toEqual([true, false, true])
    await wrapper.get('.export-button').trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({
      hiddenFeatures: ['paths', 'anchors'],
    })
    wrapper.unmount()
  })

  it('offers quality for WebP and disables transparency for JPEG', async () => {
    const wrapper = mount(ExportImageDialog, { attachTo: document.body })

    wrapper.vm.open({ width: 800, height: 600 }, [4, 3])
    await nextTick()
    const fileType = wrapper.findAll<HTMLSelectElement>('select')[1]!
    await fileType.setValue('image/webp')
    expect(wrapper.find('.alpha-field').exists()).toBe(true)
    expect(wrapper.findAll('select')).toHaveLength(3)

    await fileType.setValue('image/jpeg')
    await nextTick()
    expect(wrapper.find('.alpha-field').exists()).toBe(false)
    await wrapper.get('.export-button').trigger('click')

    expect(wrapper.emitted('export')?.[0]?.[0]).toMatchObject({
      fileType: 'image/jpeg',
      transparent: false,
      quality: 0.92,
    })
    wrapper.unmount()
  })
})
