import { usePlayerStore } from '@/stores/usePlayerStore'
import { useViewportStore } from '@/stores/useViewportStore'
import { usePlayerFrameNavigation } from '@/composables/usePlayerFrameNavigation'
import { useQSMainStore } from '@/stores/useQSMainStore'

const interactiveSelector =
  'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"])'
const textEditingSelector =
  'textarea, input:not([type]), input[type="text"], input[type="number"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], [contenteditable]:not([contenteditable="false"])'

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(interactiveSelector) !== null
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(textEditingSelector) !== null
}

export function useSpiroAnimKeyboard(): () => void {
  const viewportStore = useViewportStore()
  const playerStore = usePlayerStore('main')
  const { ROOT } = playerStore.raw()
  const { rewind, forward } = usePlayerFrameNavigation('main')
  const { undoQS, redoQS } = useQSMainStore()

  return useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.repeat || viewportStore.isTouchDevice()) return

    if (event.ctrlKey || event.metaKey) {
      if (isTextEditingTarget(event.target)) return

      const historyState =
        event.code === 'KeyZ'
          ? event.shiftKey
            ? redoQS()
            : undoQS()
          : event.code === 'KeyY' && event.ctrlKey
            ? redoQS()
            : undefined

      if (historyState === undefined) return
      ROOT.value = historyState
      event.preventDefault()
      return
    }

    if (isInteractiveTarget(event.target)) return

    switch (event.code) {
      case 'Space':
        playerStore.PLAYING = !playerStore.PLAYING
        break
      case 'ArrowLeft':
        rewind()
        break
      case 'ArrowRight':
        forward()
        break
      default:
        return
    }

    event.preventDefault()
  })
}
