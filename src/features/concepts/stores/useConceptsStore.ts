import { conceptKeys } from '@/features/concepts/types'
import type { ConceptKey } from '@/features/concepts/types'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgScaleControl,
  vtgSpacingControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { vtgDefaultSpeedRatio, vtgSpeedRatios } from '@/features/vtg/types'
import type { VtgSpeedRatio } from '@/features/vtg/types'
import {
  defaultPatternPropColors,
  type PatternPropColor,
} from '@/features/concepts/patternPropColors'

const defaultQuickSlotCount = 0
const restoredQuickSlotCount = 4
const createEmptyQuickSlots = (count: number) => Array<string | null>(count).fill(null)

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')
    const quickSlotCount = ref(defaultQuickSlotCount)
    const selectedQuickSlot = ref<number | null>(null)
    const quickSlotPaths = ref<Array<string | null>>(createEmptyQuickSlots(defaultQuickSlotCount))
    const qtrEnabled = ref(false)
    const speedRatio = ref<VtgSpeedRatio>(vtgDefaultSpeedRatio)
    const swapProps = ref(false)
    const reversePlane = ref(false)
    const bpm = ref<number>(vtgBpmControl.default)
    const scale = ref<number>(vtgScaleControl.default)
    const thick = ref<number>(vtgThickControl.default)
    const spacing = ref<number>(vtgSpacingControl.default)
    const paths = ref<boolean>(vtgPlayerSettings.paths)
    const hands = ref<boolean>(vtgPlayerSettings.hands)
    const arms = ref<boolean>(vtgPlayerSettings.arms)
    const leftPropVisible = ref(true)
    const rightPropVisible = ref(true)
    const customizeExpanded = ref(false)
    const leftPropColor = ref<PatternPropColor>(defaultPatternPropColors[0])
    const rightPropColor = ref<PatternPropColor>(defaultPatternPropColors[1])

    const resetPatternControls = () => {
      speedRatio.value = vtgDefaultSpeedRatio
      swapProps.value = false
      reversePlane.value = false
      bpm.value = vtgBpmControl.default
      scale.value = vtgScaleControl.default
      thick.value = vtgThickControl.default
      spacing.value = vtgSpacingControl.default
      paths.value = vtgPlayerSettings.paths
      hands.value = vtgPlayerSettings.hands
      arms.value = vtgPlayerSettings.arms
      leftPropVisible.value = true
      rightPropVisible.value = true
      leftPropColor.value = defaultPatternPropColors[0]
      rightPropColor.value = defaultPatternPropColors[1]
    }

    const addQuickSlot = () => {
      quickSlotCount.value++
      quickSlotPaths.value.push(null)
    }

    const removeQuickSlot = () => {
      if (quickSlotCount.value <= 0) return

      quickSlotCount.value--
      quickSlotPaths.value.length = quickSlotCount.value
      if (quickSlotCount.value === 0) {
        selectedQuickSlot.value = null
      } else if (selectedQuickSlot.value !== null) {
        selectedQuickSlot.value = Math.min(selectedQuickSlot.value, quickSlotCount.value)
      }
    }

    const restoreQuickSlots = () => {
      quickSlotCount.value = restoredQuickSlotCount
      quickSlotPaths.value = createEmptyQuickSlots(restoredQuickSlotCount)
      selectedQuickSlot.value = null
    }

    const saveCurrentQuickSlot = (path: string) => {
      if (selectedQuickSlot.value === null) return
      quickSlotPaths.value[selectedQuickSlot.value - 1] = path
    }

    const clearQuickSlot = (slot: number) => {
      if (!Number.isSafeInteger(slot) || slot < 1 || slot > quickSlotCount.value) return
      quickSlotPaths.value[slot - 1] = null
    }

    const toggleQuickSlot = (slot: number) => {
      selectedQuickSlot.value = selectedQuickSlot.value === slot ? null : slot
    }

    const selectQuickSlotForPath = (path: string) => {
      const query = path.split('?', 2)[1]?.split('#', 1)[0]
      if (!query) {
        selectedQuickSlot.value = null
        return
      }

      const matchingIndex = quickSlotPaths.value.findIndex(
        (quickSlotPath) => quickSlotPath?.split('?', 2)[1]?.split('#', 1)[0] === query,
      )
      selectedQuickSlot.value = matchingIndex === -1 ? null : matchingIndex + 1
    }

    return {
      selectedConcept,
      quickSlotCount,
      selectedQuickSlot,
      quickSlotPaths,
      qtrEnabled,
      speedRatio,
      swapProps,
      reversePlane,
      bpm,
      scale,
      thick,
      spacing,
      paths,
      hands,
      arms,
      leftPropVisible,
      rightPropVisible,
      customizeExpanded,
      leftPropColor,
      rightPropColor,
      resetPatternControls,
      addQuickSlot,
      removeQuickSlot,
      restoreQuickSlots,
      saveCurrentQuickSlot,
      clearQuickSlot,
      toggleQuickSlot,
      selectQuickSlotForPath,
    }
  },
  {
    persist: {
      pick: [
        'selectedConcept',
        'quickSlotCount',
        'selectedQuickSlot',
        'quickSlotPaths',
        'qtrEnabled',
        'speedRatio',
        'swapProps',
        'reversePlane',
        'spacing',
        'customizeExpanded',
      ],
      afterHydrate: ({ store }) => {
        const hydratedConcept: string = store.selectedConcept
        if (hydratedConcept === 'qtr') {
          store.selectedConcept = 'vtg'
          store.qtrEnabled = true
        }
        if (!conceptKeys.some((concept) => concept === store.selectedConcept)) {
          store.selectedConcept = 'vtg'
        }
        if (!Number.isSafeInteger(store.quickSlotCount) || store.quickSlotCount < 0) {
          store.quickSlotCount = defaultQuickSlotCount
        }
        if (store.quickSlotCount === 0 || store.selectedQuickSlot === null) {
          store.selectedQuickSlot = null
          // An explicitly cleared selection is valid persisted state.
        } else if (!Number.isSafeInteger(store.selectedQuickSlot) || store.selectedQuickSlot < 1) {
          store.selectedQuickSlot = 1
        } else {
          store.selectedQuickSlot = Math.min(store.selectedQuickSlot, store.quickSlotCount)
        }
        if (!Array.isArray(store.quickSlotPaths)) {
          store.quickSlotPaths = createEmptyQuickSlots(store.quickSlotCount)
        } else {
          store.quickSlotPaths = Array.from({ length: store.quickSlotCount }, (_, index) => {
            const path = store.quickSlotPaths[index]
            return typeof path === 'string' && path.length > 0 ? path : null
          })
        }
        if (!vtgSpeedRatios.includes(store.speedRatio)) {
          store.speedRatio = vtgDefaultSpeedRatio
        }
        if (
          !Number.isInteger(store.spacing) ||
          store.spacing < vtgSpacingControl.min ||
          store.spacing > vtgSpacingControl.max
        ) {
          store.spacing = vtgSpacingControl.default
        }
        if (typeof store.customizeExpanded !== 'boolean') store.customizeExpanded = false
      },
    },
  },
)
