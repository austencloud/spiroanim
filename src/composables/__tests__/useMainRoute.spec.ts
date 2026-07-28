import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createApp, defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { paneSplits, useMainRoute } from '@/composables/useMainRoute'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { useMainPaneStore } from '@/stores/useMainPaneStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useSplitterStore } from '@/stores/useSplitterStore'
import type { RootDataFinal } from '@/types/AnimTypes'

const mountedApps: ReturnType<typeof createApp>[] = []

const mountRoute = async (path: string, initialAnimation?: RootDataFinal) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  })
  await router.push(path)
  await router.isReady()

  const pinia = createPinia().use(piniaPluginPersistedstate)
  const app = createApp(
    defineComponent({
      setup() {
        if (initialAnimation) usePlayerStore('main').raw().ROOT.value = initialAnimation
        useMainRoute()
        return () => h('div')
      },
    }),
  )
  app.use(pinia)
  app.use(router)
  app.mount(document.createElement('div'))
  mountedApps.push(app)
  await nextTick()

  return {
    router,
    paneStore: useMainPaneStore(pinia),
    playerStore: usePlayerStore('main'),
    splitterStore: useSplitterStore('main'),
  }
}

const createLoadedAnimation = () => {
  const animation = createDefaultVtgAnimation({
    reference: '1-1',
    speedRatio: '1:3',
  })
  if (!animation) throw new Error('Expected a supported VTG animation')
  return animation
}

describe('useMainRoute', () => {
  beforeEach(() => localStorage.clear())

  afterEach(() => {
    while (mountedApps.length > 0) mountedApps.pop()!.unmount()
  })

  it('exports every ordered two-pane short-route combination', () => {
    expect(paneSplits).toEqual([
      '/play-time',
      '/play-edit',
      '/play-vtg',
      '/time-play',
      '/time-edit',
      '/time-vtg',
      '/edit-play',
      '/edit-time',
      '/edit-vtg',
      '/vtg-play',
      '/vtg-time',
      '/vtg-edit',
    ])
  })

  it('maps a single hidden view to the left pane and expands it fully', async () => {
    const { paneStore, splitterStore } = await mountRoute('/editor', createLoadedAnimation())

    expect(paneStore.parents).toEqual({
      player: 'hidden',
      editor: 'left',
      timeline: 'hidden',
      vtg: 'right',
    })
    expect(splitterStore.leftPerc).toBe(100)
  })

  it('switches an empty animation to the play-vtg layout', async () => {
    const { paneStore, playerStore, router, splitterStore } = await mountRoute('/editor')
    await flushPromises()

    expect(paneStore.parents).toEqual({
      player: 'left',
      editor: 'hidden',
      timeline: 'hidden',
      vtg: 'right',
    })
    expect(splitterStore.leftPerc).toBe(50)
    expect(playerStore.raw().ROOT.value).toMatchObject({ bpm: 120, props: [] })
    expect(router.currentRoute.value.path).toBe('/play-vtg')
  })

  it('does not force play-vtg when animation data is cleared after startup', async () => {
    const { paneStore, playerStore, router, splitterStore } = await mountRoute(
      '/editor',
      createLoadedAnimation(),
    )

    const runtime = playerStore.raw()
    runtime.ROOT.value = { ...runtime.ROOT.value, props: [] }
    await flushPromises()

    expect(paneStore.parents).toEqual({
      player: 'hidden',
      editor: 'left',
      timeline: 'hidden',
      vtg: 'right',
    })
    expect(splitterStore.leftPerc).toBe(100)
    expect(router.currentRoute.value.path).toBe('/editor')
  })

  it('maps short split routes and resets a persisted snapped splitter', async () => {
    localStorage.setItem('sa-splitter-main', JSON.stringify({ leftPerc: 100 }))

    const { paneStore, splitterStore } = await mountRoute('/edit-time', createLoadedAnimation())

    expect(paneStore.parents).toEqual({
      player: 'hidden',
      editor: 'left',
      timeline: 'right',
      vtg: 'hidden',
    })
    expect(splitterStore.leftPerc).toBe(50)
  })

  it('replaces the app route with the current pane layout path', async () => {
    const { router } = await mountRoute('/app')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/play-vtg')
  })

  it('maps the VTG route to a full-width pane', async () => {
    const { paneStore, splitterStore } = await mountRoute('/vtg', createLoadedAnimation())

    expect(paneStore.parents).toEqual({
      player: 'left',
      editor: 'hidden',
      timeline: 'hidden',
      vtg: 'right',
    })
    expect(splitterStore.leftPerc).toBe(0)
  })
})
