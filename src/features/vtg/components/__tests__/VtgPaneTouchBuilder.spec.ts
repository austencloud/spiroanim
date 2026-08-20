import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VtgPane from '@/features/vtg/components/VtgPane.vue'

vi.mock('@/utils/device', () => ({ isTouchDevice: () => true }))

describe('VtgPane touch Builder', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('disables native panning on drag cells in the full Builder catalog', () => {
    const wrapper = mount(VtgPane, {
      props: { builderActive: true, builderFullCatalog: true },
    })

    const pane = wrapper.get('[data-role="vtg-pane"]')
    expect(pane.classes()).toContain('vtg-pane--touch')
    expect(pane.classes()).toContain('vtg-pane--builder-drag-active')
    expect(pane.classes()).not.toContain('vtg-pane--builder-active')
    const tiles = wrapper.findAll('[data-role="vtg-tile"]')
    expect(tiles).toHaveLength(36)
    expect(new Set(tiles.map((tile) => tile.attributes('data-board-column')))).toEqual(
      new Set(['2', '3', '4', '5', '6', '7']),
    )
    expect(new Set(tiles.map((tile) => tile.attributes('data-board-row')))).toEqual(
      new Set(['1', '2', '3', '4', '5', '6']),
    )
    expect(tiles.every((tile) => tile.attributes('draggable') === 'false')).toBe(true)
  })
})
