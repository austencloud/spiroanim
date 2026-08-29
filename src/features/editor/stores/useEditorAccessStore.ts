export const useEditorAccessStore = defineStore(
  'sa-editor-access',
  () => {
    const editorEnabled = ref(false)
    const editorLoaded = ref(false)

    return { editorEnabled, editorLoaded }
  },
  {
    persist: {
      pick: ['editorEnabled'],
    },
  },
)
