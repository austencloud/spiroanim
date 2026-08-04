import { conceptKeys } from '@/features/concepts/types'
import type { ConceptKey } from '@/features/concepts/types'
import {
  vtgBpmControl,
  vtgPlayerSettings,
  vtgScaleControl,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { vtgDefaultSpeedRatio } from '@/features/vtg/types'
import type { VtgSpeedRatio } from '@/features/vtg/types'

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')
    const speedRatio = ref<VtgSpeedRatio>(vtgDefaultSpeedRatio)
    const swapProps = ref(false)
    const reversePlane = ref(false)
    const bpm = ref<number>(vtgBpmControl.default)
    const scale = ref<number>(vtgScaleControl.default)
    const thick = ref<number>(vtgThickControl.default)
    const paths = ref<boolean>(vtgPlayerSettings.paths)
    const hands = ref<boolean>(vtgPlayerSettings.hands)
    const arms = ref<boolean>(vtgPlayerSettings.arms)

    const resetPatternControls = () => {
      speedRatio.value = vtgDefaultSpeedRatio
      swapProps.value = false
      reversePlane.value = false
      bpm.value = vtgBpmControl.default
      scale.value = vtgScaleControl.default
      thick.value = vtgThickControl.default
      paths.value = vtgPlayerSettings.paths
      hands.value = vtgPlayerSettings.hands
      arms.value = vtgPlayerSettings.arms
    }

    return {
      selectedConcept,
      speedRatio,
      swapProps,
      reversePlane,
      bpm,
      scale,
      thick,
      paths,
      hands,
      arms,
      resetPatternControls,
    }
  },
  {
    persist: {
      pick: ['selectedConcept', 'speedRatio', 'swapProps', 'reversePlane'],
      afterHydrate: ({ store }) => {
        if (!conceptKeys.some((concept) => concept === store.selectedConcept)) {
          store.selectedConcept = 'vtg'
        }
        if (!['1:1', '1:3', '1:5'].includes(store.speedRatio)) {
          store.speedRatio = vtgDefaultSpeedRatio
        }
      },
    },
  },
)
