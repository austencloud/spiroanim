export const useQueryVersionStore = defineStore('query-version', () => {
  const unsupportedVersion = ref<number>()

  const reportUnsupportedVersion = (version: number) => {
    unsupportedVersion.value = version
  }

  const clearUnsupportedVersion = () => {
    unsupportedVersion.value = undefined
  }

  return { unsupportedVersion, reportUnsupportedVersion, clearUnsupportedVersion }
})
