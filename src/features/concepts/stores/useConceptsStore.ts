import type { ConceptKey } from '@/features/concepts/types'

export const useConceptsStore = defineStore(
  'sa-concepts',
  () => {
    const selectedConcept = ref<ConceptKey>('vtg')

    return { selectedConcept }
  },
  {
    persist: {
      pick: ['selectedConcept'],
      afterHydrate: ({ store }) => {
        if (store.selectedConcept !== 'vtg') store.selectedConcept = 'vtg'
      },
    },
  },
)
