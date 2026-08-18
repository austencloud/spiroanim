import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp, defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { paneKeysMain, useMainPaneStore, viewKeysMain } from '@/stores/useMainPaneStore'

const mountStore = (persist = false) => {
  const pinia = createPinia()
  if (persist) pinia.use(piniaPluginPersistedstate)
  setActivePinia(pinia)

  let store: ReturnType<typeof useMainPaneStore> | undefined
  const app = createApp(
    defineComponent({
      setup() {
        store = useMainPaneStore()
        return () => h('div')
      },
    }),
  )
  app.use(pinia)
  app.mount(document.createElement('div'))

  if (!store) throw new Error('Main pane store was not created')
  return { app, store }
}

describe('useMainPaneStore', () => {
  beforeEach(() => localStorage.clear())

  it('exports the view and pane keys with their default assignments', () => {
    const { app, store } = mountStore()

    expect(viewKeysMain).toEqual(['player', 'editor', 'timeline', 'concepts', 'builder'])
    expect(paneKeysMain).toEqual(['left', 'right', 'hidden'])
    expect(store.parents).toEqual({
      player: 'left',
      editor: 'hidden',
      timeline: 'hidden',
      concepts: 'right',
      builder: 'hidden',
    })

    app.unmount()
  })

  it('rotates to the next view not used by another visible pane', () => {
    const { app, store } = mountStore()

    store.rotatePane('left')

    expect(store.parents).toEqual({
      player: 'hidden',
      editor: 'left',
      timeline: 'hidden',
      concepts: 'right',
      builder: 'hidden',
    })
    app.unmount()
  })

  it('swaps a selected view with the view occupying its target pane', () => {
    const { app, store } = mountStore()

    store.setViewInPane('player', 'right')

    expect(store.parents).toEqual({
      player: 'right',
      editor: 'hidden',
      timeline: 'hidden',
      concepts: 'left',
      builder: 'hidden',
    })
    app.unmount()
  })

  it('moves registered view elements into their assigned pane containers', async () => {
    const { app, store } = mountStore()
    const left = document.createElement('section')
    const right = document.createElement('section')
    const hidden = document.createElement('section')
    const player = document.createElement('div')
    player.dataset.type = 'player'

    store.eLeft = left
    store.eRight = right
    store.eHidden = hidden
    store.ePlayer = player
    await nextTick()

    expect(left.firstElementChild).toBe(player)
    app.unmount()
  })

  it('tracks view visibility from pane assignment and pane visibility', async () => {
    const { app, store } = mountStore()
    await nextTick()

    expect(store.viewVisible).toEqual({
      player: true,
      editor: false,
      timeline: false,
      concepts: true,
      builder: false,
    })

    store.paneVisible.left = false
    await nextTick()
    expect(store.viewVisible.player).toBe(false)
    app.unmount()
  })

  it('hydrates only the persisted parents mapping', () => {
    localStorage.setItem(
      'sa-panes-main',
      JSON.stringify({
        parents: { player: 'hidden', editor: 'left', timeline: 'right' },
        paneVisible: { left: false, right: false },
      }),
    )

    const { app, store } = mountStore(true)

    expect(store.parents).toEqual({
      player: 'hidden',
      editor: 'left',
      timeline: 'right',
      concepts: 'hidden',
      builder: 'hidden',
    })
    expect(store.paneVisible.left).toBe(true)
    expect(store.paneVisible.right).toBe(true)
    app.unmount()
  })

  it('migrates the persisted VTG pane assignment to Concepts', () => {
    localStorage.setItem(
      'sa-panes-main',
      JSON.stringify({
        parents: { player: 'left', editor: 'hidden', timeline: 'hidden', vtg: 'right' },
      }),
    )

    const { app, store } = mountStore(true)

    expect(store.parents).toEqual({
      player: 'left',
      editor: 'hidden',
      timeline: 'hidden',
      concepts: 'right',
      builder: 'hidden',
    })
    app.unmount()
  })

  it('hijacks the pane opposite Concepts and restores its displaced view', async () => {
    const { app, store } = mountStore()
    const originalParents = { ...store.parents }

    expect(store.hijackOppositePane('builder', 'concepts')).toBe(true)
    await nextTick()
    expect(store.parents).toEqual(originalParents)
    expect(store.hijackedPane).toBe('left')
    expect(store.viewVisible.builder).toBe(true)
    expect(store.viewVisible.player).toBe(false)
    expect(store.isPaneHijacked).toBe(true)

    store.exitPaneHijack()
    await nextTick()
    expect(store.parents).toEqual(originalParents)
    expect(store.viewVisible.player).toBe(true)
    expect(store.viewVisible.builder).toBe(false)
    expect(store.isPaneHijacked).toBe(false)
    app.unmount()
  })
})
