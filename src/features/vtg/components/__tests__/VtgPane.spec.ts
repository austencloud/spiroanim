import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VtgPane from '@/features/vtg/components/VtgPane.vue'

class FakeResizeObserver {
  static callback: ResizeObserverCallback | undefined
  static observed: Element[] = []

  constructor(callback: ResizeObserverCallback) {
    FakeResizeObserver.callback = callback
  }

  disconnect(): void {}

  observe(target: Element): void {
    FakeResizeObserver.observed.push(target)
  }

  unobserve(): void {}
}

describe('VtgPane', () => {
  beforeEach(() => {
    FakeResizeObserver.callback = undefined
    FakeResizeObserver.observed = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('recreates the matrix, rule cards, and blank intersection previews', () => {
    const wrapper = mount(VtgPane)

    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    expect(wrapper.findAll('[data-role="vtg-rule-card"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-blank"]')).toHaveLength(9)
    expect(wrapper.findAll('button')).toHaveLength(49)
    expect(wrapper.findAll('[data-role="vtg-divider"]')).toHaveLength(12)
    expect(wrapper.findAll('[data-role="vtg-prop"]')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--large')).toHaveLength(24)
    expect(wrapper.findAll('.vtg-rule-card__prop-handle--small')).toHaveLength(24)
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('SO/TS')
    expect(wrapper.get('[data-role="vtg-matrix"]').text()).toContain('TO/TS')
  })

  it('offers a typed Speed Ratio radio group above the board', async () => {
    const wrapper = mount(VtgPane)
    const group = wrapper.get('fieldset.vtg-speed-ratio')
    const options = group.findAll<HTMLInputElement>('input[type="radio"]')

    expect(group.get('legend').text()).toBe('Speed Ratio: Hands Props')
    expect(options.map((option) => option.element.value)).toEqual(['1:1', '1:3', '1:5'])
    expect(options[0]?.element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-speed-ratio')).toBe('1:1')

    await options[2]?.setValue()

    expect(options[2]?.element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-speed-ratio')).toBe('1:5')
  })

  it('maps the extracted header descriptions to both sets of rule buttons', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const sideRule = wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]')
    const bottomRule = wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 5"]')

    expect(wrapper.findAll('[data-role="vtg-rule-card"][aria-describedby]')).toHaveLength(12)
    expect(sideRule.attributes('aria-describedby')).toBeTruthy()
    expect(bottomRule.attributes('aria-describedby')).toBeTruthy()

    await sideRule.trigger('mouseenter')
    vi.runAllTimers()
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Tog Split - Hands are together but the props are facing 180 degrees apart.',
    )

    wrapper.unmount()
  })

  it('derives Hands and Props tooltips for all matrix buttons', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const exampleCell = wrapper.get('[data-cell-reference="1-6"]')

    expect(wrapper.findAll('[data-role="vtg-tile"][aria-describedby]')).toHaveLength(36)

    await exampleCell.trigger('mouseenter')
    vi.runAllTimers()
    await nextTick()

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      'Hands: Split Time / Opposite Direction\nProps: Together Time / Split Time',
    )

    wrapper.unmount()
  })

  it('uses bottom-then-left references and highlights a selected matrix cross', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')
    const exampleCell = wrapper.get('[data-cell-reference="1-5"]')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
    expect(exampleCell.element.tagName).toBe('BUTTON')
    expect(exampleCell.attributes('data-board-column')).toBe('2')
    expect(exampleCell.attributes('data-board-row')).toBe('2')
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(0)
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]').attributes('aria-pressed'),
    ).toBe('false')
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 6"]').attributes('aria-pressed'),
    ).toBe('false')

    await exampleCell.trigger('click')

    expect(pane.attributes('data-selected-cell')).toBe('1-5')
    expect(exampleCell.attributes('aria-pressed')).toBe('true')
    expect(exampleCell.classes()).toContain('vtg-tile--selected')
    expect(wrapper.findAll('.vtg-tile--selected')).toHaveLength(1)
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(11)
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 1"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-5', speedRatio: '1:1' }]])
  })

  it('includes the selected speed ratio in each pattern request', async () => {
    const wrapper = mount(VtgPane)

    await wrapper.get<HTMLInputElement>('input[value="1:5"]').setValue()
    await wrapper.get('[data-cell-reference="1-6"]').trigger('click')

    expect(wrapper.emitted('patternSelect')).toEqual([[{ reference: '1-6', speedRatio: '1:5' }]])
  })

  it('temporarily previews a hovered cross and restores the clicked selection', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')
    const selectedCell = wrapper.get('[data-cell-reference="1-5"]')
    const hoveredCell = wrapper.get('[data-cell-reference="4-2"]')
    const nextHoveredCell = wrapper.get('[data-cell-reference="6-3"]')

    await selectedCell.trigger('click')
    await hoveredCell.trigger('mouseenter')

    expect(pane.attributes('data-selected-cell')).toBe('1-5')
    expect(pane.attributes('data-previewed-cell')).toBe('4-2')
    expect(selectedCell.classes()).toContain('vtg-tile--selected')
    expect(hoveredCell.classes()).not.toContain('vtg-tile--selected')
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(11)
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 4"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 2"]').attributes('aria-pressed'),
    ).toBe('true')

    await hoveredCell.trigger('mouseleave')

    expect(pane.attributes('data-previewed-cell')).toBe('4-2')

    await nextHoveredCell.trigger('mouseenter')
    vi.advanceTimersByTime(50)
    await nextTick()

    expect(pane.attributes('data-previewed-cell')).toBe('6-3')

    await nextHoveredCell.trigger('mouseleave')
    vi.advanceTimersByTime(50)
    await nextTick()

    expect(pane.attributes('data-selected-cell')).toBe('1-5')
    expect(pane.attributes('data-previewed-cell')).toBeUndefined()
    expect(selectedCell.attributes('aria-pressed')).toBe('true')
    expect(
      wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 1"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(
      wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 5"]').attributes('aria-pressed'),
    ).toBe('true')
  })

  it('restores the neutral state after hovering when nothing has been clicked', async () => {
    vi.useFakeTimers()
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')
    const hoveredCell = wrapper.get('[data-cell-reference="6-6"]')

    await hoveredCell.trigger('mouseenter')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
    expect(pane.attributes('data-previewed-cell')).toBe('6-6')
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(11)

    await hoveredCell.trigger('mouseleave')

    expect(pane.attributes('data-previewed-cell')).toBe('6-6')

    vi.advanceTimersByTime(50)
    await nextTick()

    expect(pane.attributes('data-previewed-cell')).toBeUndefined()
    expect(wrapper.findAll('.vtg-tile--highlighted')).toHaveLength(0)
  })

  it('keeps the left column and bottom row inert for now', async () => {
    const wrapper = mount(VtgPane)
    const pane = wrapper.get('[data-role="vtg-pane"]')

    await wrapper.get('[data-role="vtg-sidebar"] [aria-label$="rule 6"]').trigger('click')
    await wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 1"]').trigger('click')
    await wrapper.get('.vtg-shuffle').trigger('click')

    expect(pane.attributes('data-selected-cell')).toBeUndefined()
  })

  it('uses one shortened prop length and keeps split props clear of the divider', () => {
    const wrapper = mount(VtgPane)
    const propElements = wrapper
      .findAll<HTMLElement>('[data-role="vtg-prop"]')
      .map(({ element }) => element)

    expect(
      propElements.every((element) => {
        const length = element.style.blockSize || element.style.inlineSize
        return length === '37%'
      }),
    ).toBe(true)

    const splitRule = wrapper.get('[data-role="vtg-footer"] [aria-label$="rule 5"]')
    const splitProps = splitRule.findAll<HTMLElement>('[data-role="vtg-prop"]')

    expect(splitProps.map(({ element }) => element.style.insetInlineStart)).toEqual(['4%', '59%'])
    expect(splitRule.findAll('.vtg-rule-card__prop-handle')).toHaveLength(4)
  })

  it('tracks the live width and height of each blank preview', async () => {
    const wrapper = mount(VtgPane)
    const firstBlank = wrapper.get('[data-blank-index="0"]').element
    const entry = {
      target: firstBlank,
      contentRect: { width: 71.25, height: 68.5 },
    } as ResizeObserverEntry

    FakeResizeObserver.callback?.([entry], new FakeResizeObserver(() => {}))
    await nextTick()

    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-width')).toBe('71.25')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-blank-height')).toBe('68.5')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-width')).toBe('71.25')
    expect(wrapper.get('[data-blank-index="0"]').attributes('data-height')).toBe('68.5')
  })
})
