import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import QstPagination from '@/features/quarter-space-tech/components/QstPagination.vue'

describe('QstPagination', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('renders the current page and emits requested page changes', async () => {
    const wrapper = mount(QstPagination, {
      props: { pageCount: 4, pageIndex: 1 },
    })

    expect(wrapper.findAll('[data-role="qst-page"]')).toHaveLength(4)
    expect(wrapper.get('[data-page="2"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get<HTMLButtonElement>('[data-role="qst-page-previous"]').element.disabled).toBe(
      false,
    )
    expect(wrapper.get<HTMLButtonElement>('[data-role="qst-page-next"]').element.disabled).toBe(
      false,
    )

    await wrapper.get('[data-role="qst-page-previous"]').trigger('click')
    await wrapper.get('[data-page="4"]').trigger('click')
    await wrapper.get('[data-role="qst-page-next"]').trigger('click')

    expect(wrapper.emitted('change')).toEqual([[0], [3], [2]])
  })

  it('disables navigation at the first and last pages', async () => {
    const wrapper = mount(QstPagination, {
      props: { pageCount: 3, pageIndex: 0 },
    })

    expect(wrapper.get<HTMLButtonElement>('[data-role="qst-page-previous"]').element.disabled).toBe(
      true,
    )
    await wrapper.setProps({ pageIndex: 2 })
    expect(wrapper.get<HTMLButtonElement>('[data-role="qst-page-next"]').element.disabled).toBe(
      true,
    )
  })

  it.each([
    { width: 200, pageCounts: [5, 5, 4] },
    { width: 128, pageCounts: [4, 4, 3, 3] },
  ])('balances page numbers across every required row at $width pixels', async (scenario) => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(scenario.width)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'BUTTON' ? 32 : 0
    })

    const wrapper = mount(QstPagination, {
      props: { pageCount: 14, pageIndex: 0 },
    })
    await nextTick()

    const rows = wrapper.findAll('[data-role="qst-pagination-row"]')
    expect(rows).toHaveLength(scenario.pageCounts.length)
    expect(rows.map((row) => row.findAll('[data-role="qst-page"]').length)).toEqual(
      scenario.pageCounts,
    )
    expect(rows[0]?.find('[data-role="qst-page-previous"]').exists()).toBe(true)
    expect(rows.at(-1)?.find('[data-role="qst-page-next"]').exists()).toBe(true)
  })
})
