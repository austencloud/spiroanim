import { createPaneStore } from '@/stores/createPaneStore'

export const builderViewKeys = ['player', 'thumbnails'] as const
export const builderPaneKeys = ['top', 'bottom', 'hidden'] as const

export const useBuilderPaneStore = createPaneStore(
  'builder',
  builderViewKeys,
  builderPaneKeys,
  'hidden',
  {
    top: 'player',
    bottom: 'thumbnails',
  },
)
