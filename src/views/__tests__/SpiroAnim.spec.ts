import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSplitterStore } from '@/stores/useSplitterStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { usePropertiesStore } from '@/features/editor/stores/usePropertiesStore'
import { useConceptsStore } from '@/features/concepts/stores/useConceptsStore'
import { useQSMainStore } from '@/stores/useQSMainStore'
import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createQtrAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { createEightStepAnimation } from '@/features/eight-step/createEightStepAnimation'
import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { createVtgTransitionPreviewAnimations } from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'

describe('SpiroAnim view', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('sa-concepts', JSON.stringify({ vtgAdvanced: true }))
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
    const playerStore = usePlayerStore('main')
    const playerRoot = playerStore.raw().ROOT
    const initialAnimation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!initialAnimation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = initialAnimation
    const propertiesStore = usePropertiesStore('main')
    propertiesStore.pFRAMES = 'motion'
    await nextTick()
    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')

    const wrapper = mount(SpiroAnim, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
          Timeline: {
            template: '<div>Timeline<button type="button" aria-label="Show Full Timeline" /></div>',
          },
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
    expect((wrapper.get('[data-role="left-pane"]').element as HTMLElement).style.overflow).toBe(
      'clip',
    )
    expect((wrapper.get('[data-role="left-pane"]').element as HTMLElement).style.minWidth).toBe(
      '0px',
    )
    const rightPane = wrapper.get('[data-role="right-pane"]')
    expect(rightPane.text()).toContain('Timeline')
    expect((rightPane.element as HTMLElement).style.overflow).toBe('clip')
    expect((rightPane.element as HTMLElement).style.minWidth).toBe('0px')
    expect(wrapper.text()).not.toContain('Editor')
    expect(wrapper.findAll('button[aria-label="Swap Views"]')).toHaveLength(2)
    const showAllTimelineProps = wrapper.get('button[aria-label="Show Full Timeline"]')
    const swapViews = wrapper.findAll('button[aria-label="Swap Views"]')[1]!
    expect(showAllTimelineProps.element.closest('[data-role="right-pane"]')).toBe(rightPane.element)
    expect(swapViews.element.closest('[data-role="right-pane"]')).toBe(rightPane.element)

    const paneStore = useMainPaneStore()
    paneStore.setViewInPane('concepts', 'right')
    await flushPromises()
    const routeBeforeHijack = router.currentRoute.value.fullPath
    const pathBeforeHijack = router.currentRoute.value.path
    expect(paneStore.hijackOppositePane('builder', 'concepts')).toBe(true)
    await flushPromises()
    paneStore.exitPaneHijack()
    await flushPromises()
    expect(paneStore.hijackOppositePane('builder', 'concepts')).toBe(true)
    await flushPromises()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-builder-full-grid"]').setValue(true)
    await flushPromises()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-builder-full-grid"]').setValue(false)
    await flushPromises()
    expect(wrapper.find('[data-role="player-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="vtg-transition-support-error"]').exists()).toBe(false)
    wrapper.get('[data-role="builder-player"]')
    playerStore.PLAYING = false
    await wrapper.get('[data-cell-reference="1-2"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(true)
    expect(playerStore.PLAYING).toBe(false)
    expect(playerStore.PREVIEW_PLAYING).toBe(true)
    expect(playerStore.raw().CURRENT.value).toBe(0)
    const countdown = wrapper.get('[data-role="builder-preview-countdown"]')
    const previewMaximum = playerStore.PLAYBACK_MAX
    playerStore.raw().CURRENT.value = Math.max(previewMaximum - 1_100, 0)
    await nextTick()
    expect(countdown.text()).toBe('2')
    expect(countdown.attributes('aria-label')).toContain('2 seconds remaining')
    playerStore.PREVIEW_PLAYING = false
    await nextTick()
    expect(playerStore.PREVIEW_PLAYING).toBe(false)
    expect(playerStore.PLAYING).toBe(false)
    expect(countdown.text()).toBe('')
    expect(countdown.find('svg').exists()).toBe(true)
    expect(countdown.attributes('aria-label')).toBe('Return player to loaded pattern')
    await countdown.trigger('click')
    expect(wrapper.find('[data-role="builder-preview-countdown"]').exists()).toBe(false)
    expect(playerStore.raw().CURRENT.value).toBe(0)
    expect(playerStore.PLAYING).toBe(false)

    await wrapper.get('button[aria-label="Preview pattern 1"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(playerStore.PLAYING).toBe(false)
    expect(playerStore.PREVIEW_PLAYING).toBe(false)
    expect(wrapper.find('[data-role="builder-preview-countdown"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    expect(wrapper.find('[data-role="vtg-transition-preview-drop-target"]').exists()).toBe(false)
    expect(wrapper.get('[data-preview-index="0"]').classes()).toContain(
      'vtg-transition-previews__item--selected',
    )
    const replacementDragData = new Map<string, string>()
    const replacementDataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: (type: string, value: string) => replacementDragData.set(type, value),
      getData: (type: string) => replacementDragData.get(type) ?? '',
    }
    const rootBeforeReplacement = playerRoot.value
    const routeBeforeReplacement = router.currentRoute.value.fullPath
    await wrapper.get('[data-cell-reference="3-4"]').trigger('dragstart', {
      dataTransfer: replacementDataTransfer,
    })
    await wrapper.get('[data-preview-index="0"]').trigger('drop', {
      dataTransfer: replacementDataTransfer,
    })
    await flushPromises()
    expect(playerRoot.value).not.toBe(rootBeforeReplacement)
    const replacedFirstPreview = createVtgTransitionPreviewAnimations(playerRoot.value)?.[0]
    expect(replacedFirstPreview).toBeDefined()
    expect(findVtgPatternMatch(replacedFirstPreview!)).toMatchObject({ reference: '3-4' })
    expect(router.currentRoute.value.fullPath).not.toBe(routeBeforeReplacement)
    expect(wrapper.get('[data-preview-index="0"]').classes()).toContain(
      'vtg-transition-previews__item--selected',
    )
    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    playerStore.raw().CURRENT.value = 500
    await wrapper.findAll('[data-role="vtg-transition-preview-reverse"]')[0]!.trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(playerStore.raw().CURRENT.value).toBe(0)
    expect(wrapper.find('[data-role="builder-preview-countdown"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(8)

    playerStore.setPlaybackOverride(playerRoot.value)
    playerStore.raw().CURRENT.value = 0
    await nextTick()
    playerStore.PLAYING = false
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }))
    expect(playerStore.PLAYING).toBe(true)
    expect(playerStore.PREVIEW_PLAYING).toBe(false)
    const dragData = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: (type: string, value: string) => dragData.set(type, value),
      getData: (type: string) => dragData.get(type) ?? '',
    }
    const frameCountBeforeDrop = playerRoot.value.props[0]!.anim.length
    const insertedStartMS = playerStore.MAX
    playerStore.PLAYING = false
    await wrapper.get('[data-cell-reference="1-2"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(true)
    expect(playerStore.PLAYING).toBe(false)
    expect(playerStore.PREVIEW_PLAYING).toBe(false)
    await wrapper.get('[data-cell-reference="1-2"]').trigger('dragstart', { dataTransfer })
    await wrapper
      .get('[data-role="vtg-transition-preview-drop-target"]')
      .trigger('drop', { dataTransfer })
    await flushPromises()
    expect(playerRoot.value.props[0]!.anim).toHaveLength(frameCountBeforeDrop + 8)
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(playerStore.raw().CURRENT.value).toBe(insertedStartMS)
    expect(playerStore.PLAYING).toBe(false)
    await wrapper.get('button[aria-label="Preview pattern 2"]').trigger('click')
    await flushPromises()
    expect(playerStore.raw().CURRENT.value).toBe(0)
    await wrapper.get('button[aria-label="Preview pattern 2"]').trigger('click')
    await flushPromises()
    expect(playerStore.raw().CURRENT.value).toBe(insertedStartMS)
    await wrapper.get('[data-cell-reference="1-2"]').trigger('dragstart', { dataTransfer })
    await wrapper
      .get('[data-role="vtg-transition-preview-drop-target"]')
      .trigger('drop', { dataTransfer })
    await flushPromises()
    await wrapper.get('button[aria-label="Preview pattern 2"]').trigger('click')
    await flushPromises()
    await wrapper.get('button[aria-label="Delete pattern 2"]').trigger('click')
    await flushPromises()
    expect(playerStore.raw().CURRENT.value).toBe(insertedStartMS)
    expect(wrapper.get('[aria-label="Builder Columns"] output').text()).toBe('4')
    wrapper.get('[data-role="builder-qslots"]')
    expect(wrapper.find('.builder-pane__development-warning').exists()).toBe(false)
    const builderView = wrapper.get('[data-role="builder-pane-view"]')
    const builderTopPane = builderView.get('[data-role="top-pane"]')
    const builderBottomPane = builderView.get('[data-role="bottom-pane"]')
    expect(
      wrapper.get('[data-role="builder-player"]').element.closest('[data-role="top-pane"]'),
    ).toBe(builderTopPane.element)
    expect(
      wrapper.get('[data-role="builder-thumbnails"]').element.closest('[data-role="bottom-pane"]'),
    ).toBe(builderBottomPane.element)
    expect(
      wrapper
        .get('[aria-label="Builder Columns"]')
        .element.closest('[data-role="builder-thumbnails"]'),
    ).toBe(wrapper.get('[data-role="builder-thumbnails"]').element)
    await wrapper.get('button[aria-label="Swap Builder Views"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.get('[data-role="builder-player"]').element.closest('[data-role="bottom-pane"]'),
    ).toBe(builderBottomPane.element)
    expect(
      wrapper.get('[data-role="builder-thumbnails"]').element.closest('[data-role="top-pane"]'),
    ).toBe(builderTopPane.element)
    await wrapper.get('button[aria-label="Increase Builder Columns"]').trigger('click')
    expect(wrapper.get('[aria-label="Builder Columns"] output').text()).toBe('5')
    expect(
      wrapper
        .get<HTMLElement>('[data-role="vtg-transition-previews"]')
        .element.style.getPropertyValue('--vtg-transition-preview-columns'),
    ).toBe('5')
    const durationSlider = wrapper.get<HTMLInputElement>(
      '[data-role="vtg-transition-preview-beats"]',
    )
    const frameCountBeforeResize = playerRoot.value.props[0]!.anim.length
    playerStore.PLAYING = false
    await wrapper.get('button[aria-label="Preview pattern 1"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    await durationSlider.trigger('pointerdown')
    await durationSlider.setValue(String(Number(durationSlider.element.value) + 0.5))
    await durationSlider.trigger('pointerup')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(playerStore.raw().CURRENT.value).toBe(0)
    expect(playerStore.PLAYING).toBe(false)
    expect(playerRoot.value.props[0]!.anim).toHaveLength(frameCountBeforeResize + 1)
    expect(Number(durationSlider.element.max)).toBe(Number(durationSlider.element.value) + 2)
    await durationSlider.trigger('pointerdown')
    await durationSlider.setValue(durationSlider.element.max)
    await durationSlider.trigger('pointerup')
    await flushPromises()
    expect(playerRoot.value.props[0]!.anim).toHaveLength(frameCountBeforeResize + 5)
    await wrapper.get('button[aria-label="Preview pattern 1"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    await wrapper.get('button[aria-label="Delete pattern 1"]').trigger('click')
    await flushPromises()
    expect(playerStore.PLAYBACK_PREVIEW_ACTIVE).toBe(false)
    expect(playerStore.raw().CURRENT.value).toBe(0)
    expect(playerStore.PLAYING).toBe(false)
    expect(router.currentRoute.value.path).toBe(pathBeforeHijack)
    expect(router.currentRoute.value.fullPath).not.toBe(routeBeforeHijack)
    expect(
      wrapper.get('[data-role="builder-pane-view"]').element.closest('[data-role="left-pane"]'),
    ).toBe(wrapper.get('[data-role="left-pane"]').element)
    expect(wrapper.findAll('button[aria-label="Swap Views"]')).toHaveLength(0)
    expect(wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]').element.disabled).toBe(
      true,
    )
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-pattern-builder"]').element.checked).toBe(
      true,
    )

    await wrapper.get('button[aria-label="Delete pattern 1"]').trigger('click')
    await flushPromises()
    expect(playerRoot.value.props).toHaveLength(0)
    expect(wrapper.findAll('[data-role="vtg-tile"]')).toHaveLength(36)
    expect(wrapper.find('[data-role="vtg-playback-controls"]').exists()).toBe(true)
    wrapper.get('[data-role="vtg-qtr"]')
    wrapper.get('[data-role="vtg-orientation"]')
    wrapper.get('[data-role="vtg-beat"]')
    playerRoot.value = initialAnimation
    await flushPromises()
    const routeAfterBuilderEdit = router.currentRoute.value.fullPath
    expect(router.currentRoute.value.fullPath).toBe(routeAfterBuilderEdit)

    await wrapper.get('[data-role="vtg-pattern-builder"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-role="builder-pane-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="player-view"]').exists()).toBe(true)
    expect(wrapper.findAll('button[aria-label="Swap Views"]')).toHaveLength(2)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-pattern-builder"]').element.checked).toBe(
      false,
    )
    expect(router.currentRoute.value.fullPath).toBe(routeAfterBuilderEdit)

    expect(paneStore.hijackOppositePane('builder', 'concepts')).toBe(true)
    await flushPromises()
    await wrapper.get('button[aria-label="Exit Pattern Builder"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-role="builder-pane-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-role="player-view"]').exists()).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe(routeAfterBuilderEdit)

    paneStore.setViewInPane('editor', 'right')
    await flushPromises()
    expect(propertiesStore.showFullTimeline).toBe(false)
    expect(propertiesStore.pFRAMES).toBe('motion')
    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(false)

    propertiesStore.pFRAMES = 'motion'
    await flushPromises()
    paneStore.setViewInPane('timeline', 'right')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(true)

    propertiesStore.pFRAMES = 'animation'
    propertiesStore.pSELECTED = { 0: true, 1: false }
    const player = usePlayerStore('main')
    const fullTimes = [...new Set(player.PTIMES.flat())].sort((first, second) => first - second)
    const overallEnd = player.UTIMES.at(-1) ?? 0
    player.ETIMES = overallEnd > (fullTimes.at(-1) ?? 0) ? [...fullTimes, overallEnd] : fullTimes
    await flushPromises()

    expect(wrapper.find('button[aria-label="Show Full Timeline"]').exists()).toBe(true)
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
    expect(wrapper.find('[data-role="concept-docs-anchor"]').exists()).toBe(true)
    await vi.waitFor(() => {
      expect(
        wrapper
          .get('[data-role="concepts-view"] [data-role="vtg-pane"]')
          .attributes('data-selected-cell'),
      ).toBe('5-6')
    })
    expect(wrapper.get<HTMLInputElement>('input[value="1:3"]').element.checked).toBe(true)
    expect(wrapper.get('[data-role="vtg-spin-toggle"]').text()).toBe('Anti')
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').element.checked).toBe(true)
    expect(wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').element.checked).toBe(true)

    await wrapper.get<HTMLInputElement>('input[value="1:1"]').setValue()
    await wrapper.get<HTMLInputElement>('[data-role="vtg-swap"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-reverse"]').setValue(false)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-bpm"]').setValue(60)
    await wrapper.get<HTMLInputElement>('[data-role="vtg-scale"]').setValue(0.8)
    const resetBeforePattern = player.cameraReset
    await wrapper.get('[data-cell-reference="6-1"]').trigger('click')

    expect(player.cameraReset).not.toBe(resetBeforePattern)
    expect(playerRoot.value).toMatchObject({
      aspectx: vtgPlayerSettings.aspectx,
      aspecty: vtgPlayerSettings.aspecty,
      props: [
        {
          anim: [{ arc: 90, scale: 9 }, { arc: 45 }, {}, {}, {}, {}, {}, {}, {}],
        },
        {
          anim: [
            { plane: 180, arc: 90, scale: 9 },
            { arc: 45, turns: -90 },
            {},
            {},
            {},
            {},
            {},
            {},
            {},
          ],
        },
      ],
    })
    const expectedOneToThree = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
      bpm: 60,
    })
    await wrapper.get<HTMLInputElement>('input[value="1:3"]').setValue()
    await wrapper.get('[data-cell-reference="1-1"]').trigger('click')

    expect(playerRoot.value).toEqual(expectedOneToThree)

    const expectedQuarter = createQtrAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
      quarters: 1,
      bpm: 60,
    })
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)
    await flushPromises()

    expect(playerRoot.value).toEqual(expectedQuarter)

    const expectedVtgAgain = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
      bpm: 60,
    })
    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(false)
    await flushPromises()

    expect(playerRoot.value).toEqual(expectedVtgAgain)

    const expectedEightStep = createEightStepAnimation(playerRoot.value, {
      concept: '8stp',
      reference: '8-II',
      bpm: 60,
    })
    await wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]').setValue('8stp')
    const conceptsStore = useConceptsStore()
    conceptsStore.restoreQuickSlots()
    const previousQuickSlot = conceptsStore.quickSlotPaths[0]
    conceptsStore.selectedQuickSlot = 2
    await wrapper.get('[data-cell-reference="8-II"]').trigger('click')

    expect(playerRoot.value).toEqual(expectedEightStep)
    expect(playerRoot.value.props.map(({ anim }) => anim.length)).toEqual([13, 13])
    expect(conceptsStore.quickSlotPaths[0]).toBe(previousQuickSlot)
    expect(conceptsStore.quickSlotPaths[1]).toMatch(/^\/8stp-time\?r=/)

    wrapper.unmount()
    expect(document.documentElement.classList.contains('disable-scroll')).toBe(false)
  }, 15_000)

  it('does not save a Quick Slot when animation data is loaded from a URL', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    const playerRoot = usePlayerStore('main').raw().ROOT
    const animation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!animation) throw new Error('Expected a supported VTG animation')
    const query = useQSMainStore().encodeQS(animation, false)
    await router.push({ path: '/play-vtg', query })
    await router.isReady()
    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')

    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
        },
      },
    })
    await flushPromises()

    expect(useConceptsStore().quickSlotPaths).toEqual([])

    wrapper.unmount()
  })

  it('keeps an empty persisted Quick Slot selected when the startup fallback populates it', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    localStorage.setItem(
      'sa-concepts',
      JSON.stringify({
        selectedConcept: 'vtg',
        quickSlotCount: 4,
        selectedQuickSlot: 3,
        quickSlotPaths: [null, null, null, null],
      }),
    )
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/app')
    await router.isReady()
    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')

    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
        },
      },
    })
    await flushPromises()

    const conceptsStore = useConceptsStore()
    expect(conceptsStore.selectedQuickSlot).toBe(3)
    expect(conceptsStore.quickSlotPaths[2]).toMatch(/^\/play-vtg\?r=/)
    expect(wrapper.get<HTMLInputElement>('input[value="3"]').element.checked).toBe(true)

    wrapper.unmount()
  })

  it('applies a stored Quick Slot without changing the pane layout', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/vtg-play')
    await router.isReady()

    const playerRoot = usePlayerStore('main').raw().ROOT
    const initialAnimation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!initialAnimation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = initialAnimation

    const createdTargetAnimation = createEightStepAnimation(playerRoot.value, {
      concept: '8stp',
      reference: '1-AA',
    })
    if (!createdTargetAnimation) throw new Error('Expected a supported Eight Step animation')
    const targetAnimation = { ...createdTargetAnimation, bpm: createdTargetAnimation.bpm + 1 }
    const qsStore = useQSMainStore()
    const targetPath = router.resolve({
      path: '/play-8stp',
      query: qsStore.encodeQS(targetAnimation, false),
    }).fullPath
    const conceptsStore = useConceptsStore()
    conceptsStore.restoreQuickSlots()
    conceptsStore.quickSlotPaths[1] = targetPath

    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')
    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
        },
      },
    })
    await flushPromises()
    const paneStore = useMainPaneStore()
    const originalParents = structuredClone(toRaw(paneStore.parents))

    await wrapper.get<HTMLInputElement>('[data-role="concepts-view"] input[value="2"]').setValue()
    await flushPromises()

    expect(qsStore.encodeQS(playerRoot.value, false)).toEqual(
      qsStore.encodeQS(targetAnimation, false),
    )
    expect(paneStore.parents).toEqual(originalParents)
    expect(conceptsStore.selectedConcept).toBe('8stp')
    expect(router.currentRoute.value.path).toBe('/8stp-play')

    wrapper.unmount()
  })

  it('replaces the Concepts pane with the Timeline targeted by a Quick Slot', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/play-vtg')
    await router.isReady()

    const playerRoot = usePlayerStore('main').raw().ROOT
    const animation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!animation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = animation
    const conceptsStore = useConceptsStore()
    conceptsStore.restoreQuickSlots()
    conceptsStore.quickSlotPaths[0] = router.resolve({
      path: '/play-time',
      query: useQSMainStore().encodeQS(animation, false),
    }).fullPath

    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')
    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: { Player: { template: '<div />' }, Timeline: { template: '<div />' } },
      },
    })
    await flushPromises()
    await wrapper.get<HTMLInputElement>('input[value="1"]').setValue()
    await flushPromises()

    const paneStore = useMainPaneStore()
    expect(paneStore.parents.timeline).toBe('right')
    expect(paneStore.parents.concepts).toBe('hidden')
    expect(router.currentRoute.value.path).toBe('/play-time')
    wrapper.unmount()
  })

  it('replaces the Timeline pane with Concepts when targeted by a Quick Slot', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/play-time')
    await router.isReady()

    const playerRoot = usePlayerStore('main').raw().ROOT
    const animation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!animation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = animation
    const targetPath = router.resolve({
      path: '/play-vtg',
      query: useQSMainStore().encodeQS(animation, false),
    }).fullPath
    await router.replace({
      path: '/play-time',
      query: useQSMainStore().encodeQS(animation, false),
    })
    const TimelineStub = defineComponent({
      emits: { quickSlotApply: (_path: string) => true },
      setup(_, { emit }) {
        return () =>
          h('button', {
            'data-role': 'apply-timeline-quick-slot',
            onClick: () => emit('quickSlotApply', targetPath),
          })
      },
    })

    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')
    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: { Player: { template: '<div />' }, Timeline: TimelineStub },
      },
    })
    await flushPromises()
    await wrapper.get('[data-role="timeline-view"]').trigger('click')
    await flushPromises()

    const paneStore = useMainPaneStore()
    expect(paneStore.parents.concepts).toBe('right')
    expect(paneStore.parents.timeline).toBe('hidden')
    expect(router.currentRoute.value.path).toBe('/play-vtg')
    wrapper.unmount()
  })

  it('keeps the Editor pane when its embedded Timeline loads a Timeline target', async () => {
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    const playerRoot = usePlayerStore('main').raw().ROOT
    const animation = createVtgAnimation(playerRoot.value, {
      reference: '1-1',
      speedRatio: '1:3',
    })
    if (!animation) throw new Error('Expected a supported VTG animation')
    playerRoot.value = animation
    const query = useQSMainStore().encodeQS(animation, false)
    await router.push({ path: '/play-edit', query })
    await router.isReady()
    const targetPath = router.resolve({ path: '/play-time', query }).fullPath
    const EditorStub = defineComponent({
      emits: { quickSlotApply: (_path: string) => true },
      setup(_, { emit }) {
        return () => h('button', { onClick: () => emit('quickSlotApply', targetPath) })
      },
    })

    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')
    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: { Player: { template: '<div />' }, Editor: EditorStub },
      },
    })
    await flushPromises()
    await wrapper.get('[data-role="editor-view"]').trigger('click')
    await flushPromises()

    const paneStore = useMainPaneStore()
    expect(paneStore.parents.editor).toBe('right')
    expect(paneStore.parents.timeline).toBe('hidden')
    expect(router.currentRoute.value.path).toBe('/play-edit')
    wrapper.unmount()
  })

  it('does not auto-select a Concepts pattern for unsupported animation data', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const pinia = createPinia().use(piniaPluginPersistedstate)
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
    })
    await router.push('/vulcan-tech-gospel?r=future-format&p0=untouched&v=999')
    await router.isReady()
    const { default: SpiroAnim } = await import('@/views/SpiroAnim.vue')

    const wrapper = mount(SpiroAnim, {
      global: {
        plugins: [pinia, router],
        stubs: {
          Player: { template: '<div>Player</div>' },
        },
      },
    })
    await flushPromises()

    const selector = wrapper.get<HTMLSelectElement>('[data-role="concept-selector"]')
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBeUndefined()

    await wrapper.get<HTMLInputElement>('[data-role="vtg-qtr"]').setValue(true)
    await flushPromises()
    expect(wrapper.get('[data-role="vtg-pane"]').attributes('data-selected-cell')).toBeUndefined()

    await selector.setValue('8stp')
    await flushPromises()
    expect(
      wrapper.get('[data-role="eight-step-pane"]').attributes('data-selected-cell'),
    ).toBeUndefined()
    expect(consoleWarn).toHaveBeenCalledWith(
      'Failed to load animation data from the route.',
      expect.objectContaining({ name: 'UnsupportedSpiroAnimQSVersionError', version: 999 }),
    )

    wrapper.unmount()
  })
})
