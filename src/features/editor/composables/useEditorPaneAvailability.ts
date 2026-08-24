import { useEditorAccessStore } from '@/features/editor/stores/useEditorAccessStore'
import { paneKeysMain, useMainPaneStore, viewKeysMain } from '@/stores/useMainPaneStore'

type MainPane = (typeof paneKeysMain)[number]
type VisibleMainPane = Exclude<MainPane, 'hidden'>

const visiblePaneKeys = paneKeysMain.filter((pane): pane is VisibleMainPane => pane !== 'hidden')

const panePriority = (
  pane: VisibleMainPane,
  parents: ReturnType<typeof useMainPaneStore>['parents'],
): number => {
  const view = viewKeysMain.find((candidate) => parents[candidate] === pane)
  if (view === 'timeline') return 0
  if (view === 'player') return 2
  return 1
}

/** Keeps Editor access and the main pane layout in sync when access changes. */
export function useEditorPaneAvailability() {
  const editorAccessStore = useEditorAccessStore()
  const paneStore = useMainPaneStore()
  const { editorEnabled } = storeToRefs(editorAccessStore)

  const preferredVisiblePane = (): VisibleMainPane | undefined =>
    visiblePaneKeys
      .filter((pane) => paneStore.paneVisible[pane] && paneStore.hijackedPane !== pane)
      .sort(
        (first, second) =>
          panePriority(first, paneStore.parents) - panePriority(second, paneStore.parents),
      )[0]

  watch(editorEnabled, (enabled) => {
    if (enabled) {
      if (paneStore.isPaneHijacked) paneStore.exitPaneHijack()
      if (paneStore.viewVisible.editor) return

      const targetPane = preferredVisiblePane()
      if (targetPane) paneStore.setViewInPane('editor', targetPane)
      return
    }

    if (!paneStore.viewVisible.editor) return
    const editorPane = paneStore.parents.editor
    if (editorPane !== 'hidden') paneStore.rotatePane(editorPane)
  })
}
