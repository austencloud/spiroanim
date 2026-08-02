import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSplitterStore } from '@/stores/useSplitterStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createQtrAnimation } from '@/features/qtr/createQtrAnimation'
import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'

describe('SpiroAnim view', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
      dispatchEvent: vi.fn<() => boolean>(() => true),
    }))
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        width: 412,
        height: 760,
        offsetLeft: 3,
        offsetTop: 48,
      }),
    })
  })

  afterEach(() => {
    document.documentElement.classList.remove('disable-scroll', 'disable-text-select')
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    })
    vi.unstubAllGlobals()
  })

  it('composes pane controls and the requested placeholder views', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/play-time')
    await router.isReady()
    const playerRoot = usePlayerStore('main').raw().ROOT
    const initialAnimation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!initialAnimation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = initialAnimation
    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')

    const wrapper = mount(SpiroAnim, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
          Timeline: { template: '<div>Timeline</div>' },
        },
      },
    })
    await flushPromises()

    const container = wrapper.get('[data-role="main-container"]')
    const containerStyle = (container.element as HTMLElement).style
    expect(container.attributes('data-role')).toBe('main-container')
    expect(containerStyle.position).toBe('fixed')
    expect(containerStyle.left).toBe('3px')
    expect(containerStyle.top).toBe('48px')
    expect(containerStyle.width).toBe('412px')
    expect(containerStyle.height).toBe('760px')
    expect(wrapper.get('[data-role="left-pane"]').text()).toContain('Player')
    expect(wrapper.get('[data-role="right-pane"]').text()).toContain('Timeline')
    expect(wrapper.text()).not.toContain('Editor')
    expect(wrapper.findAll('button[aria-label="Swap Views"]')).toHaveLength(2)
    const menuButton = wrapper.get('button[aria-label="Open SpiroAnim menu"]')
    expect(menuButton.attributes('aria-haspopup')).toBe('menu')
    expect(menuButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('button[aria-label="Resize"]').attributes('title')).toBeUndefined()
    expect(document.documentElement.classList.contains('disable-scroll')).toBe(true)

    const splitter = useSplitterStore('main')
    expect(splitter.leftPerc).toBe(50)

    const hydratedVtg = createVtgAnimation(playerRoot.value, {
      reference: '5-6',
      speedRatio: '1:3',
      isAnti: true,
      swapProps: true,
      reversePlane: true,
      bpm: 87,
      scale: 0.6,
    })
    if (!hydratedVtg) throw new Error('Expected a supported VTG animation')
    playerRoot.value = hydratedVtg

    useMainPaneStore().setViewInPane('concepts', 'left')
    await flushPromises()
    expect(wrapper.get('[data-role="left-pane"]').text()).toContain('VTG')
    expect(
      wrapper
        .get('[data-role="concepts-view"] [data-role="vtg-pane"]')
        .attributes('data-selected-cell'),
    ).toBe('5-6')
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)

    await wrapper.get<HTMLInputElement>('input[value="1:1"]').setValue()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').setValue(60)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(0.8)
    await wrapper.get('[data-cell-reference="6-1"]').trigger('click')

    expect(playerRoot.value).toMatchObject({
      aspectx: vtgPlayerSettings.aspectx,
      aspecty: vtgPlayerSettings.aspecty,
      props: [
        {
          anim: [{ plane: 180, arc: 90 }, { plane: 180, arc: 90 }, {}, {}, {}],
        },
        {
          anim: [{ plane: 180, arc: 90 }, { arc: 90, turns: -180 }, {}, {}, {}],
        },
      ],
    })

    const expectedOneToThree = createVtgAnimation(playerRoot.value, {
      reference: '6-2',
      speedRatio: '1:3',
    })
    await wrapper.get<HTMLInputElement>('input[value="1:3"]').setValue()
    await wrapper.get('[data-cell-reference="6-2"]').trigger('click')

    expect(playerRoot.value).toEqual(expectedOneToThree)

    const expectedQuarter = createQtrAnimation(playerRoot.value, {
      reference: '6-2',
      speedRatio: '1:3',
      quarters: 1,
    })
    await wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]').setValue('qtr')
    await flushPromises()

    expect(playerRoot.value).toEqual(expectedQuarter)

    const expectedVtgAgain = createVtgAnimation(playerRoot.value, {
      reference: '6-2',
      speedRatio: '1:3',
    })
    await wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]').setValue('vtg')
    await flushPromises()

    expect(playerRoot.value).toEqual(expectedVtgAgain)

    wrapper.unmount()
    expect(document.documentElement.classList.contains('disable-scroll')).toBe(false)
  })
})
