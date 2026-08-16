export const MIN_TIMELINE_COLUMN_OFFSET = -3
export const MAX_TIMELINE_COLUMN_OFFSET = 5
export const MIN_TIMELINE_COLUMNS = 1
export const MAX_TIMELINE_COLUMNS = 6

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(value, maximum))

export const useTimelineSettingsStore = defineStore(
  'timeline-settings',
  () => {
    const columnOffset = ref(0)

    watch(
      columnOffset,
      (value) => {
        columnOffset.value = clamp(
          Math.round(value),
          MIN_TIMELINE_COLUMN_OFFSET,
          MAX_TIMELINE_COLUMN_OFFSET,
        )
      },
      { flush: 'sync' },
    )

    const decreaseColumnOffset = () => {
      columnOffset.value = Math.max(columnOffset.value - 1, MIN_TIMELINE_COLUMN_OFFSET)
    }

    const increaseColumnOffset = () => {
      columnOffset.value = Math.min(columnOffset.value + 1, MAX_TIMELINE_COLUMN_OFFSET)
    }

    const adjustedColumnCount = (baseColumnCount: number) =>
      clamp(baseColumnCount + columnOffset.value, MIN_TIMELINE_COLUMNS, MAX_TIMELINE_COLUMNS)

    return {
      columnOffset,
      decreaseColumnOffset,
      increaseColumnOffset,
      adjustedColumnCount,
    }
  },
  {
    persist: {
      key: 'sa-timeline-settings-v1',
      pick: ['columnOffset'],
    },
  },
)
