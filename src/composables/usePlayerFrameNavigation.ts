import { usePlayerStore } from '@/stores/usePlayerStore'

export function usePlayerFrameNavigation(storeId: string): {
  rewind: () => void
  forward: () => void
} {
  const playerStore = usePlayerStore(storeId)
  const { CURRENT } = playerStore.raw()
  const { CONTROL_INDEX, SELECTION, SELECTED, CONTROL_TIMES, UPDATE } = storeToRefs(playerStore)

  function rewind() {
    if (CURRENT.value > 0) {
      if (SELECTION.value) {
        const selectionStart = SELECTED.value[0] ?? 0
        if (CURRENT.value <= CONTROL_TIMES.value[selectionStart]!) {
          if (selectionStart === 0) return
          SELECTED.value[0] = selectionStart - 1
          CURRENT.value = CONTROL_TIMES.value[selectionStart - 1]!
          UPDATE.value = Symbol()
          return
        }
        CURRENT.value = CONTROL_TIMES.value[CONTROL_INDEX.value - 1]! // Beginning of previous
      } else if (CURRENT.value == CONTROL_TIMES.value[CONTROL_INDEX.value]!)
        CURRENT.value = CONTROL_TIMES.value[CONTROL_INDEX.value]! - 1 // End of previous
      else CURRENT.value = CONTROL_TIMES.value[CONTROL_INDEX.value]! // Start of current
      UPDATE.value = Symbol()
    }
  }

  function forward() {
    if (CONTROL_TIMES.value.length - 1 > CONTROL_INDEX.value) {
      if (SELECTION.value) {
        const selectionEnd = SELECTED.value[1] ?? 0
        if (CURRENT.value >= CONTROL_TIMES.value[selectionEnd]! - 1) {
          if (selectionEnd >= CONTROL_TIMES.value.length - 1) return
          SELECTED.value[1] = selectionEnd + 1
          CURRENT.value = CONTROL_TIMES.value[selectionEnd]!
          UPDATE.value = Symbol()
          return
        }
      }
      if (SELECTION.value || CURRENT.value == CONTROL_TIMES.value[CONTROL_INDEX.value + 1]! - 1)
        CURRENT.value = CONTROL_TIMES.value[CONTROL_INDEX.value + 1]! // Start of next
      else CURRENT.value = CONTROL_TIMES.value[CONTROL_INDEX.value + 1]! - 1 // End of current
      UPDATE.value = Symbol()
    }
  }

  return { rewind, forward }
}
