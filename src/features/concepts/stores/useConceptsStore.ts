import type { ConceptKey } from '@/features/concepts/types'
import { vtgDefaultSpeedRatio } from '@/features/vtg/types'
import type { VtgSpeedRatio } from '@/features/vtg/types'

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')
    const speedRatio = ref<VtgSpeedRatio>(vtgDefaultSpeedRatio)
    const swapProps = ref(false)
    const reversePlane = ref(false)

    return { selectedConcept, speedRatio, swapProps, reversePlane }
  },
  {
    persist: {
      pick: ['selectedConcept', 'speedRatio', 'swapProps', 'reversePlane'],
      afterHydrate: ({ store }) => {
        if (store.selectedConcept !== 'vtg' && store.selectedConcept !== 'qtr') {
          store.selectedConcept = 'vtg'
        }
        if (!['1:1', '1:3', '1:5'].includes(store.speedRatio)) {
          store.speedRatio = vtgDefaultSpeedRatio
        }
      },
    },
  },
)
