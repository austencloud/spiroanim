export const useEditorAccessStore = defineStore(
  'sa-editor-access',
  () => {
    const editorEnabled = ref(false)

    return { editorEnabled }
  },
  {
    persist: {
      pick: ['editorEnabled'],
    },
  },
)
