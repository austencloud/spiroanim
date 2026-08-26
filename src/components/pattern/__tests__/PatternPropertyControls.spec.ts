import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import PatternPropertyControls from '@/components/pattern/PatternPropertyControls.vue'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'

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

    expect([axis.text(), twist.text()]).toEqual(['Rotate', 'Twist - For Roll-Sensitive Props'])
    expect(turns.exists()).toBe(false)
    expect(axis.attributes('aria-expanded')).toBe('false')

    await axis.trigger('click')
    expect(wrapper.emitted('update:activeProperty')?.at(-1)).toEqual(['axis'])
    await wrapper.setProps({ activeProperty: 'axis' })
    expect(axis.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-role="vtg-property-axis-controls"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-role="vtg-property-axis-controls"]').text()).toContain('BeatValue')
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Mirror folds"]').element.checked).toBe(
      true,
    )

    await twist.trigger('click')
    expect(wrapper.emitted('update:activeProperty')?.at(-1)).toEqual(['twist'])
    await wrapper.setProps({ activeProperty: 'twist' })
    expect(axis.attributes('aria-expanded')).toBe('false')
    expect(twist.attributes('aria-expanded')).toBe('true')
    expect(
      wrapper.get<HTMLElement>('[data-role="vtg-property-axis-controls"]').element.style.display,
    ).toBe('none')
    expect(wrapper.get('[data-role="vtg-property-twist-controls"]').isVisible()).toBe(true)

    await twist.trigger('click')
    expect(wrapper.emitted('update:activeProperty')?.at(-1)).toEqual([null])
    await wrapper.setProps({ activeProperty: null })
    expect(twist.attributes('aria-expanded')).toBe('false')
    expect(
      wrapper.get<HTMLElement>('[data-role="vtg-property-twist-controls"]').element.style.display,
    ).toBe('none')
  })

  it('adds descriptive tooltips to Folds and Twist', () => {
    const wrapper = mount(PatternPropertyControls, { props: { context: 'vtg' } })

    expect(
      wrapper.get('[data-role="vtg-property-axis-toggle"]').attributes('aria-describedby'),
    ).toBeTruthy()
    expect(
      wrapper.get('[data-role="vtg-property-twist-toggle"]').attributes('aria-describedby'),
    ).toBeTruthy()
  })

  it('instantly reveals an opened Folds or Twist header above the scroll viewport', async () => {
    const scrollParent = document.createElement('div')
    scrollParent.style.overflowY = 'auto'
    scrollParent.scrollTop = 100
    document.body.appendChild(scrollParent)
    const scrollTo = vi.fn<(options: ScrollToOptions) => void>()
    function mockScrollTo(options?: ScrollToOptions): void
    function mockScrollTo(x: number, y: number): void
    function mockScrollTo(optionsOrX?: ScrollToOptions | number, _y?: number) {
      if (typeof optionsOrX === 'object') scrollTo(optionsOrX)
    }
    scrollParent.scrollTo = mockScrollTo
    scrollParent.getBoundingClientRect = () =>
      ({ top: 20, bottom: 220, left: 0, right: 200, width: 200, height: 200 }) as DOMRect

    const wrapper = mount(PatternPropertyControls, {
      attachTo: scrollParent,
      props: { context: 'vtg', propertiesExpanded: true },
    })
    const folds = wrapper.get<HTMLElement>('[data-role="vtg-property-axis-toggle"]')
    folds.element.getBoundingClientRect = () =>
      ({ top: -30, bottom: 0, left: 0, right: 200, width: 200, height: 30 }) as DOMRect

    await wrapper.setProps({ activeProperty: 'axis' })
    await nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'auto' })
    wrapper.unmount()
    scrollParent.remove()
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

  it('edits and clears per-beat Twist values independently for Left and Right', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: {
        context: 'vtg',
        animation,
        twistMode: 'advanced',
        twistValues: [{ 0: 45 }, {}],
      },
    })
    await wrapper.get('[data-role="vtg-property-twist-toggle"]').trigger('click')

    const leftFirst = wrapper.get<HTMLInputElement>('[data-role="vtg-twist-0-0"]')
    const rightFirst = wrapper.get<HTMLInputElement>('[data-role="vtg-twist-1-0"]')
    expect(leftFirst.attributes()).toMatchObject({ min: '0', max: '7', step: '1' })
    expect(leftFirst.attributes('aria-valuetext')).toBe('45°')
    expect(rightFirst.attributes('aria-valuetext')).toBe('0°')
    expect(leftFirst.element.closest('label')?.classList).toContain(
      'pattern-property-controls__value-set',
    )
    expect(rightFirst.element.closest('label')?.classList).not.toContain(
      'pattern-property-controls__value-set',
    )
    expect(rightFirst.element.closest('label')?.textContent).toContain('0°')
    expect(rightFirst.element.closest('label')?.textContent).not.toContain('Inherited')
    expect(wrapper.get('[aria-label="Left Twist"] header').text()).toBe('BeatLeftValue')
    expect(wrapper.get('[aria-label="Right Twist"] header').text()).toBe('BeatRightValue')

    rightFirst.element.value = '4'
    await rightFirst.trigger('input')
    expect(wrapper.emitted('twistUpdate')?.at(-1)).toEqual([1, 0, 90])

    const leftDelete = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Clear Left Twist at beat 0"]',
    )
    const rightDelete = wrapper.get<HTMLButtonElement>(
      'button[aria-label="Clear Right Twist at beat 0"]',
    )
    expect(leftDelete.element.disabled).toBe(false)
    expect(rightDelete.element.disabled).toBe(true)
    await leftDelete.trigger('click')
    expect(wrapper.emitted('twistUpdate')?.at(-1)).toEqual([0, 0])
  })

  it('offers only supported nonzero 90-degree slider values for Twist and Rotate', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: { context: 'vtg', animation, twistMode: 'advanced', foldMode: 'advanced' },
    })

    const twist = wrapper.get<HTMLInputElement>('[data-role="vtg-twist-0-0"]')
    twist.element.value = '3'
    await twist.trigger('input')
    expect(wrapper.emitted('twistUpdate')?.at(-1)).toEqual([0, 0, -90])
    twist.element.value = '4'
    await twist.trigger('input')
    expect(wrapper.emitted('twistUpdate')?.at(-1)).toEqual([0, 0, 90])

    const direct = wrapper.get<HTMLInputElement>('input[aria-label="Left Direct at beat 0"]')
    expect(direct.attributes()).toMatchObject({ min: '0', max: '1', step: '1' })
    direct.element.value = '0'
    await direct.trigger('input')
    expect(wrapper.emitted('foldUpdate')?.at(-1)).toEqual([0, 0, 'yaw', -90])
    direct.element.value = '1'
    await direct.trigger('input')
    expect(wrapper.emitted('foldUpdate')?.at(-1)).toEqual([0, 0, 'yaw', 90])
  })

  it('defaults to Simple and renders only beat 0.5 without discarding controlled values', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: { context: 'vtg', animation, twistValues: [{ 0.5: 45, 2.5: 90 }, {}] },
    })

    expect(wrapper.get<HTMLInputElement>('input[value="simple"]').element.checked).toBe(true)
    expect(wrapper.findAll('[data-role^="vtg-twist-"]')).toHaveLength(2)
    expect(
      wrapper.get<HTMLInputElement>('[data-role="vtg-twist-0-1"]').attributes('aria-valuetext'),
    ).toBe('45°')
    expect(wrapper.get('[data-role="vtg-property-twist-controls"]').text()).not.toContain('2.5')

    await wrapper.get('input[value="advanced"]').trigger('change')
    expect(wrapper.emitted('update:twistMode')?.at(-1)).toEqual(['advanced'])
  })

  it('groups Direct and Rotate under one shared beat in each Folds column', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: {
        context: 'vtg',
        animation,
        foldValues: [{ 0: { yaw: 45, rotate: 90 } }, {}],
        foldMode: 'advanced',
      },
    })
    await wrapper.get('[data-role="vtg-property-axis-toggle"]').trigger('click')

    const firstFrame = wrapper.get(
      '[aria-label="Left Folds"] .pattern-property-controls__fold-frame',
    )
    expect(firstFrame.findAll('.pattern-property-controls__beat')).toHaveLength(1)
    expect(firstFrame.findAll('input[type="range"]')).toHaveLength(2)
    expect(firstFrame.findAll('.pattern-property-controls__value-set')).toHaveLength(2)
    expect(firstFrame.text()).toContain('Direct45°')
    expect(firstFrame.text()).toContain('Rotate90°')
  })

  it('shows 90 degrees as the unset Direct default', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: { context: 'vtg', animation, foldMode: 'advanced' },
    })

    expect(
      wrapper
        .get<HTMLInputElement>('input[aria-label="Left Direct at beat 0"]')
        .attributes('aria-valuetext'),
    ).toBe('90°')
    expect(
      wrapper.get('button[aria-label="Clear Left Direct at beat 0"]').attributes(),
    ).toHaveProperty('disabled')
  })

  it('shows the preceding Direct value when an Advanced beat is unset', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: {
        context: 'vtg',
        animation,
        foldMode: 'advanced',
        foldValues: [{ 0: { yaw: -90 } }, {}],
      },
    })

    expect(
      wrapper
        .get<HTMLInputElement>('input[aria-label="Left Direct at beat 0.5"]')
        .attributes('aria-valuetext'),
    ).toBe('-90°')
    expect(
      wrapper.get<HTMLButtonElement>('button[aria-label="Clear Left Direct at beat 0.5"]').element
        .disabled,
    ).toBe(true)
  })

  it('shows the authored Simple Rotate value for a materialized Quarter transition', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: {
        context: 'vtg',
        animation,
        foldBeat: [2, 2],
        foldValues: [{ 2: { rotate: 90 } }, {}],
        foldValuesMaterialized: true,
        foldSpan: 'quarter',
      },
    })

    expect(
      wrapper
        .get<HTMLInputElement>('input[aria-label="Left Rotate at beat 2"]')
        .attributes('aria-valuetext'),
    ).toBe('180°')
  })

  it('uses steppers for Twist and Folds when Customize Sliders is disabled', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:1' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(PatternPropertyControls, {
      props: {
        context: 'vtg',
        animation,
        sliders: false,
        twistMode: 'advanced',
        foldMode: 'advanced',
      },
      global: { plugins: [pinia] },
    })

    expect(wrapper.findAll('input[type="range"]')).toHaveLength(0)
    wrapper.get('[data-role="vtg-yaw-0-0-stepper"]')
    wrapper.get('[data-role="vtg-rotate-0-0-stepper"]')
    wrapper.get('[data-role="vtg-twist-0-0-stepper"]')

    await wrapper.get('[data-role="vtg-yaw-0-0-stepper-decrease"]').trigger('click')
    expect(wrapper.emitted('foldUpdate')?.at(-1)).toEqual([0, 0, 'yaw', -90])
    await wrapper.get('[data-role="vtg-twist-0-0-stepper-decrease"]').trigger('click')
    expect(wrapper.emitted('twistUpdate')?.at(-1)).toEqual([0, 0, -90])
  })

  it('offers styled Simple fold repetition and span controls', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: { context: 'vtg', animation, foldMirror: false },
    })

    expect(
      wrapper.get<HTMLInputElement>('input[name$="-fold-mode"]:checked').element.nextElementSibling
        ?.textContent,
    ).toBe('Simple')
    expect(
      wrapper.get<HTMLInputElement>('input[name$="-fold-span"]:checked').element.nextElementSibling
        ?.textContent,
    ).toBe('Eighth')
    expect(
      wrapper.get<HTMLSelectElement>('select[aria-label="Left folds start"]').element.value,
    ).toBe('2')
    expect(
      wrapper.get<HTMLSelectElement>('select[aria-label="Right folds start"]').element.value,
    ).toBe('2')
    expect(
      wrapper.get<HTMLSelectElement>('select[aria-label="Left repeat folds every"]').element.value,
    ).toBe('2')
    expect(
      wrapper.get<HTMLSelectElement>('select[aria-label="Right repeat folds every"]').element.value,
    ).toBe('2')
    expect(wrapper.get('input[type="checkbox"] + span').classes()).not.toContain('native')
    expect(wrapper.findAll('input[aria-label^="Apply "]')).toHaveLength(0)
    expect(
      wrapper.findAll('[aria-label="Left Folds"] .pattern-property-controls__fold-frame'),
    ).toHaveLength(1)

    await wrapper.setProps({ foldSpan: 'quarter' })
    expect(
      wrapper
        .get<HTMLSelectElement>('select[aria-label="Left folds start"]')
        .findAll('option')
        .map((option) => option.text()),
    ).toContain('0.5')
    expect(
      wrapper
        .get<HTMLSelectElement>('select[aria-label="Left repeat folds every"]')
        .findAll('option')
        .map((option) => option.text()),
    ).toContain('0.5')
  })

  it('offers Mirror only in Simple and hides both side labels and the Right controls', async () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '2:3' })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const wrapper = mount(PatternPropertyControls, {
      props: { context: 'vtg', animation, foldMirror: true },
    })

    expect(wrapper.get<HTMLInputElement>('input[aria-label="Mirror folds"]').element.checked).toBe(
      true,
    )
    expect(wrapper.find('[aria-label="Right Folds"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Left Folds"] h3').text()).toBe('')

    await wrapper.setProps({ foldMode: 'advanced' })
    expect(wrapper.find('input[aria-label="Mirror folds"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Left Folds"] h3').text()).toBe('Left')
    expect(wrapper.get('[aria-label="Right Folds"] h3').text()).toBe('Right')
  })
})
