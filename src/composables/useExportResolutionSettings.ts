import { getAspectLabelData } from '@/composables/useAspectRatio'
import {
  createVideoExportResolutionOptions,
  resizeVideoExportFromHeight,
  resizeVideoExportFromWidth,
  videoExportAspectRatio,
  type VideoExportDimensions,
  type VideoExportResolutionOption,
} from '@/math/videoExportResolution'

interface ExportResolutionPreferences {
  resolution: Ref<string>
  aspectRatio: Ref<number>
  customWidth: Ref<number>
  customHeight: Ref<number>
}

export function useExportResolutionSettings(preferences?: ExportResolutionPreferences) {
  const resolutionOptions = ref<VideoExportResolutionOption[]>([])
  const resolution = preferences?.resolution ?? ref('')
  const exportAspectRatio = preferences?.aspectRatio ?? ref(16 / 9)
  const customWidth = preferences?.customWidth ?? ref(1920)
  const customHeight = preferences?.customHeight ?? ref(1080)

  const selectedResolution = computed<VideoExportDimensions>(() => {
    if (resolution.value === 'custom') {
      return { width: customWidth.value, height: customHeight.value }
    }

    const selected = resolutionOptions.value.find((option) => option.value === resolution.value) ??
      resolutionOptions.value[0] ?? { width: 1920, height: 1080 }
    return { width: selected.width, height: selected.height }
  })

  function updateCustomWidth(event: Event) {
    const width = Number((event.target as HTMLInputElement).value)
    if (!Number.isFinite(width)) return
    const dimensions = resizeVideoExportFromWidth(width, exportAspectRatio.value)
    customWidth.value = dimensions.width
    customHeight.value = dimensions.height
  }

  function updateCustomHeight(event: Event) {
    const height = Number((event.target as HTMLInputElement).value)
    if (!Number.isFinite(height)) return
    const dimensions = resizeVideoExportFromHeight(height, exportAspectRatio.value)
    customWidth.value = dimensions.width
    customHeight.value = dimensions.height
  }

  function configureResolution(canvas: VideoExportDimensions, aspect: readonly [number, number]) {
    const previousResolution = resolution.value
    const previousWasCurrent =
      previousResolution !== '' && previousResolution === resolutionOptions.value[0]?.value
    const previousAspectRatio = exportAspectRatio.value
    const sourceCanvas =
      canvas.width > 0 && canvas.height > 0 ? canvas : { width: 1920, height: 1080 }
    const nextAspectRatio = videoExportAspectRatio(sourceCanvas, aspect)
    const nextOptions = createVideoExportResolutionOptions(sourceCanvas, aspect).map(
      (option, index) => {
        if (index === 0) return option
        const aspectData = getAspectLabelData(option.width, option.height)
        const aspectLabel = aspectData.match ?? aspectData.reduced
        return {
          ...option,
          label: `${option.label} (${aspectLabel})`,
        }
      },
    )
    const sameAspect =
      previousResolution !== '' && Math.abs(previousAspectRatio - nextAspectRatio) < 0.01
    const rememberedResolution = previousWasCurrent
      ? nextOptions[0]?.value
      : nextOptions.some((option) => option.value === previousResolution) ||
          previousResolution === 'custom'
        ? previousResolution
        : undefined

    resolutionOptions.value = nextOptions
    exportAspectRatio.value = nextAspectRatio
    resolution.value =
      (sameAspect ? rememberedResolution : undefined) ?? resolutionOptions.value[0]?.value ?? ''
    if (!sameAspect || resolution.value !== 'custom') {
      customWidth.value = selectedResolution.value.width
      customHeight.value = selectedResolution.value.height
    }
  }

  return {
    resolutionOptions,
    resolution,
    customWidth,
    customHeight,
    selectedResolution,
    updateCustomWidth,
    updateCustomHeight,
    configureResolution,
  }
}
