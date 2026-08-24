import { createPinia, setActivePinia } from 'pinia'
import { createApp, defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { useEditorPaneAvailability } from '@/features/editor/composables/useEditorPaneAvailability'
import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { useMainPaneStore } from '@/stores/useMainPaneStore'

const mountedApps: ReturnType<typeof createApp>[] = []

const mountPaneAvailability = () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const app = createApp(
    defineComponent({
      setup() {
        useEditorPaneAvailability()
        return () => h('div')
      },
    }),
  )
  app.use(pinia)
  app.mount(document.createElement('div'))
  mountedApps.push(app)

  return {
    editorAccessStore: useEditorAccessStore(),
    paneStore: useMainPaneStore(),
  }
}

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount()
})

describe('useEditorPaneAvailability', () => {
  it('shows Editor in Timeline pane before replacing another view', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    paneStore.setViewInPane('timeline', 'right')

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.parents.editor).toBe('right')
    expect(paneStore.parents.timeline).toBe('hidden')
  })

  it('ignores a collapsed Timeline pane and replaces another visible view', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    paneStore.setViewInPane('timeline', 'left')
    paneStore.paneVisible.left = false

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.parents.editor).toBe('right')
    expect(paneStore.parents.concepts).toBe('hidden')
  })

  it('replaces another view before replacing Player', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.parents.editor).toBe('right')
    expect(paneStore.parents.player).toBe('left')
  })

  it('uses Player when it is the only visible pane', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    paneStore.paneVisible.right = false

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.parents.editor).toBe('left')
    expect(paneStore.parents.player).toBe('hidden')
  })

  it('does not move Editor when it is already visible', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    paneStore.setViewInPane('editor', 'left')

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.parents.editor).toBe('left')
    expect(paneStore.parents.player).toBe('hidden')
    expect(paneStore.parents.concepts).toBe('right')
  })

  it('rotates a visible Editor pane to its next eligible view when disabled', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    editorAccessStore.editorEnabled = true
    await nextTick()

    const editorPane = paneStore.parents.editor
    expect(editorPane).toBe('right')

    editorAccessStore.editorEnabled = false
    await nextTick()

    expect(paneStore.parents.editor).toBe('hidden')
    expect(paneStore.parents.timeline).toBe(editorPane)
  })

  it('leaves Editor assigned to a collapsed pane when disabled', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    editorAccessStore.editorEnabled = true
    await nextTick()
    const editorPane = paneStore.parents.editor
    expect(editorPane).toBe('right')
    paneStore.paneVisible.right = false

    editorAccessStore.editorEnabled = false
    await nextTick()

    expect(paneStore.parents.editor).toBe(editorPane)
  })

  it('closes a pane hijack before applying Editor pane priority', async () => {
    const { editorAccessStore, paneStore } = mountPaneAvailability()
    paneStore.setViewInPane('timeline', 'left')
    expect(paneStore.hijackOppositePane('builder', 'concepts')).toBe(true)

    editorAccessStore.editorEnabled = true
    await nextTick()

    expect(paneStore.isPaneHijacked).toBe(false)
    expect(paneStore.parents.editor).toBe('left')
    expect(paneStore.viewVisible.editor).toBe(true)
    expect(paneStore.viewVisible.builder).toBe(false)
  })
})
