import { usePlayerStore } from '@/stores/usePlayerStore'
import { useViewportStore } from '@/stores/useViewportStore'
import { usePlayerFrameNavigation } from '@/composables/usePlayerFrameNavigation'
import { useQSMainStore } from '@/stores/useQSMainStore'

const textEditingSelector =
  'textarea, input:not([type]), input[type="text"], input[type="number"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], [contenteditable]:not([contenteditable="false"])'

function getFocusedEventTarget(target: EventTarget | null): Element | undefined {
  if (
    !(target instanceof Element) ||
    target === document.body ||
    target === document.documentElement
  ) {
    return undefined
  }

  return target
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  const editingTarget = target.closest(textEditingSelector)
  if (editingTarget instanceof HTMLInputElement || editingTarget instanceof HTMLTextAreaElement) {
    return !editingTarget.readOnly && !editingTarget.disabled
  }

  return editingTarget !== null
}

export function useSpiroAnimKeyboard(): () => void {
  const viewportStore = useViewportStore()
  const playerStore = usePlayerStore('main')
  const { ROOT } = playerStore.raw()
  const { rewind, forward } = usePlayerFrameNavigation('main')
  const { undoQS, redoQS } = useQSMainStore()
  let pointerFocusedElement: Element | undefined

  const rememberPointerFocus = (target: EventTarget | null) => {
    const pointerTarget = target instanceof Element ? target : undefined
    if (pointerTarget === undefined) {
      pointerFocusedElement = undefined
      return
    }

    queueMicrotask(() => {
      const focusedElement = getFocusedEventTarget(document.activeElement)
      const label = pointerTarget.closest('label')
      const labelControl = label instanceof HTMLLabelElement ? label.control : null
      const focusCameFromPointer =
        focusedElement !== undefined &&
        (focusedElement === pointerTarget ||
          focusedElement.contains(pointerTarget) ||
          pointerTarget.contains(focusedElement) ||
          focusedElement === labelControl)

      pointerFocusedElement = focusCameFromPointer ? focusedElement : undefined
    })
  }

  const stopPointerTracking = useEventListener(
    window,
    'pointerdown',
    (event: PointerEvent) => {
      rememberPointerFocus(event.target)
    },
    { capture: true },
  )

  const stopPointerClickTracking = useEventListener(window, 'click', (event: MouseEvent) => {
    if (event.detail > 0) rememberPointerFocus(event.target)
  })

  const stopFocusTracking = useEventListener(
    window,
    'focusin',
    () => {
      pointerFocusedElement = undefined
    },
    { capture: true },
  )

  const stopKeyboard = useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
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

      const focusedTarget = getFocusedEventTarget(event.target)
      const useShortcutAfterPointerFocus =
        focusedTarget === pointerFocusedElement && !isTextEditingTarget(event.target)
      if (focusedTarget !== undefined && !useShortcutAfterPointerFocus) return

      switch (event.code) {
        case 'Space':
          if (playerStore.PLAYBACK_TEMPORARY_ACTIVE)
            playerStore.PREVIEW_PLAYING = !playerStore.PREVIEW_PLAYING
          else playerStore.PLAYING = !playerStore.PLAYING
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
    },
    { capture: true },
  )

  return () => {
    stopKeyboard()
    stopFocusTracking()
    stopPointerClickTracking()
    stopPointerTracking()
  }
}
