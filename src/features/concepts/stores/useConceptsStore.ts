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

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')
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
    }

    return {
      selectedConcept,
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
      resetPatternControls,
    }
  },
  {
    persist: {
      pick: ['selectedConcept', 'qtrEnabled', 'speedRatio', 'swapProps', 'reversePlane', 'spacing'],
      afterHydrate: ({ store }) => {
        const hydratedConcept: string = store.selectedConcept
        if (hydratedConcept === 'qtr') {
          store.selectedConcept = 'vtg'
          store.qtrEnabled = true
        }
        if (!conceptKeys.some((concept) => concept === store.selectedConcept)) {
          store.selectedConcept = 'vtg'
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
      },
    },
  },
)
