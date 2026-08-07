import { useProperties } from '@/features/editor/composables/useProperties'
import { usePlayerStore } from '@/stores/usePlayerStore'

// Shared routines for features/editor/components/properties/manage

export function useManageProperties(store: string) {
  const { SELECTION, SELECTED, EINDEX, PTIMES, MTIMES, CTIMES, ETIMES } = storeToRefs(
    usePlayerStore(store),
  )
  const { pSELECTED, pFRAMES } = useProperties(store)

  const propSelection = (cb: (prop: number, start: number, end: number) => void) => {
    const sel: number[] = [],
      unq = ETIMES.value,
      startTime = unq[SELECTION.value ? SELECTED.value[0]! : EINDEX.value] ?? 0,
      endTime = unq[SELECTION.value ? SELECTED.value[1]! : EINDEX.value] ?? 0

    for (const i in pSELECTED.value) if (pSELECTED.value[i]) sel.push(parseInt(i, 10))

    for (const i in sel) {
      const ind = sel[i]!,
        times = (pFRAMES.value === 'animation' ? PTIMES.value : MTIMES.value)[ind] ?? []
      let start, end

      for (let j = 0; j < times.length; j++) {
        if (times[j]! > endTime) break
        else if (times[j]! >= startTime) {
          start = j
          break
        }
      }

      for (let j = times.length - 1; j >= 0; j--) {
        if (times[j]! < startTime) break
        else if (times[j]! <= endTime) {
          end = j
          break
        }
      }

      //if ( start !== undefined && end !== undefined )
      cb(ind, start ?? -1, end ?? -1)
    }
  }

  const cameraSelection = (cb: (start: number, end: number) => void) => {
    const startTime = ETIMES.value[SELECTION.value ? SELECTED.value[0]! : EINDEX.value] ?? 0
    const endTime = ETIMES.value[SELECTION.value ? SELECTED.value[1]! : EINDEX.value] ?? 0
    let start = -1
    let end = -1

    for (let index = 0; index < CTIMES.value.length; index++) {
      const time = CTIMES.value[index]!
      if (time >= startTime && time <= endTime) {
        if (start === -1) start = index
        end = index
      }
    }

    cb(start, end)
  }

  return { propSelection, cameraSelection }
}
