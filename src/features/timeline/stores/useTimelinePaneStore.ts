import { createPaneStore } from '@/stores/createPaneStore'

export const timelineViewKeys = ['player', 'timeline'] as const
export const timelinePaneKeys = ['top', 'bottom', 'hidden'] as const

export const useTimelinePaneStore = createPaneStore(
  'timeline',
  timelineViewKeys,
  timelinePaneKeys,
  'hidden',
  {
    top: 'player',
    bottom: 'timeline',
  },
)
