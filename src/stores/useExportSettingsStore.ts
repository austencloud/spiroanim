import type { ImageExportFeature, ImageExportFileType } from '@/types/ImageExportTypes'
import { DEFAULT_EXPORT_FILE_NAME } from '@/utils/exportFileName'

const defaultHiddenFeatures = (): Record<ImageExportFeature, boolean> => ({
  paths: false,
  hands: false,
  visible: false,
  nodes: false,
  anchors: false,
  guides: false,
})

export const useExportSettingsStore = defineStore(
  'export-settings',
  () => {
    const fileName = ref(DEFAULT_EXPORT_FILE_NAME)
    const imageResolution = ref('')
    const imageAspectRatio = ref(16 / 9)
    const imageCustomWidth = ref(1920)
    const imageCustomHeight = ref(1080)
    const imageFileType = ref<ImageExportFileType>('image/png')
    const imageQuality = ref(0.92)
    const imageBackgroundColor = ref('#090b0f')
    const imageTransparent = ref(true)
    const imageHiddenFeatures = ref(defaultHiddenFeatures())

    const videoResolution = ref('')
    const videoAspectRatio = ref(16 / 9)
    const videoCustomWidth = ref(1920)
    const videoCustomHeight = ref(1080)
    const videoFramerate = ref(60)
    const videoBitrate = ref(16_000_000)
    const videoBackgroundColor = ref('#090b0f')
    const videoTransparent = ref(false)
    const videoCodec = ref('')

    return {
      fileName,
      imageResolution,
      imageAspectRatio,
      imageCustomWidth,
      imageCustomHeight,
      imageFileType,
      imageQuality,
      imageBackgroundColor,
      imageTransparent,
      imageHiddenFeatures,
      videoResolution,
      videoAspectRatio,
      videoCustomWidth,
      videoCustomHeight,
      videoFramerate,
      videoBitrate,
      videoBackgroundColor,
      videoTransparent,
      videoCodec,
    }
  },
  {
    persist: {
      key: 'sa-export-settings-v1',
      pick: [
        'fileName',
        'imageResolution',
        'imageAspectRatio',
        'imageCustomWidth',
        'imageCustomHeight',
        'imageFileType',
        'imageQuality',
        'imageBackgroundColor',
        'imageTransparent',
        'imageHiddenFeatures',
        'videoResolution',
        'videoAspectRatio',
        'videoCustomWidth',
        'videoCustomHeight',
        'videoFramerate',
        'videoBitrate',
        'videoBackgroundColor',
        'videoTransparent',
        'videoCodec',
      ],
    },
  },
)
