import { usePlayerStore } from '@/stores/usePlayerStore'

export function usePlayerFrameNavigation(storeId: string): {
  rewind: () => void
  forward: () => void
} {
  const playerStore = usePlayerStore(storeId)
  const { CURRENT } = playerStore.raw()
  const { INDEX, SELECTION, SELECTED, UTIMES, UPDATE } = storeToRefs(playerStore)

  function rewind() {
    if (CURRENT.value > 0) {
      if (SELECTION.value) {
        const selectionStart = SELECTED.value[0] ?? 0
        if (CURRENT.value <= UTIMES.value[selectionStart]!) {
          if (selectionStart === 0) return
          SELECTED.value[0] = selectionStart - 1
          CURRENT.value = UTIMES.value[selectionStart - 1]!
          UPDATE.value = Symbol()
          return
        }
        CURRENT.value = UTIMES.value[INDEX.value - 1]! // Beginning of previous
      } else if (CURRENT.value == UTIMES.value[INDEX.value]!)
        CURRENT.value = UTIMES.value[INDEX.value]! - 1 // End of previous
      else CURRENT.value = UTIMES.value[INDEX.value]! // Start of current
      UPDATE.value = Symbol()
    }
  }

  function forward() {
    if (UTIMES.value.length - 1 > INDEX.value) {
      if (SELECTION.value) {
        const selectionEnd = SELECTED.value[1] ?? 0
        if (CURRENT.value >= UTIMES.value[selectionEnd]! - 1) {
          if (selectionEnd >= UTIMES.value.length - 1) return
          SELECTED.value[1] = selectionEnd + 1
          CURRENT.value = UTIMES.value[selectionEnd]!
          UPDATE.value = Symbol()
          return
        }
      }
      if (SELECTION.value || CURRENT.value == UTIMES.value[INDEX.value + 1]! - 1)
        CURRENT.value = UTIMES.value[INDEX.value + 1]! // Start of next
      else CURRENT.value = UTIMES.value[INDEX.value + 1]! - 1 // End of current
      UPDATE.value = Symbol()
    }
  }

  return { rewind, forward }
}
