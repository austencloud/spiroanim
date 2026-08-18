export const MIN_BUILDER_COLUMNS = 1
export const MAX_BUILDER_COLUMNS = 6
export const DEFAULT_BUILDER_COLUMNS = 4

const clampColumns = (value: number) =>
  Math.max(MIN_BUILDER_COLUMNS, Math.min(Math.round(value), MAX_BUILDER_COLUMNS))

export const useBuilderSettingsStore = defineStore(
  'builder-settings',
  () => {
    const columns = ref(DEFAULT_BUILDER_COLUMNS)

    watch(columns, (value) => (columns.value = clampColumns(value)), { flush: 'sync' })

    const decreaseColumns = () => {
      columns.value = Math.max(columns.value - 1, MIN_BUILDER_COLUMNS)
    }

    const increaseColumns = () => {
      columns.value = Math.min(columns.value + 1, MAX_BUILDER_COLUMNS)
    }

    return { columns, decreaseColumns, increaseColumns }
  },
  {
    persist: {
      key: 'sa-builder-settings-v1',
      pick: ['columns'],
    },
  },
)
