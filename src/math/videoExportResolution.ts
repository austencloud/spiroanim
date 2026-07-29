import { fitToAspect } from '@/math/aspectRatio'

export interface VideoExportDimensions {
  width: number
  height: number
}

export interface VideoExportResolutionOption extends VideoExportDimensions {
  label: string
  value: string
}

export const MAX_VIDEO_EXPORT_DIMENSION = 3840
export const MIN_VIDEO_EXPORT_DIMENSION = 64

const commonShortEdges = [720, 1080, 1440, 2160] as const

function nearestEven(value: number): number {
  return Math.max(MIN_VIDEO_EXPORT_DIMENSION, Math.round(value / 2) * 2)
}

function dimensionsFromWidth(width: number, ratio: number): VideoExportDimensions {
  const evenWidth = nearestEven(width)
  return {
    width: evenWidth,
    height: nearestEven(evenWidth / ratio),
  }
}

function dimensionsFromHeight(height: number, ratio: number): VideoExportDimensions {
  const evenHeight = nearestEven(height)
  return {
    width: nearestEven(evenHeight * ratio),
    height: evenHeight,
  }
}

function fitWithinMaximum(dimensions: VideoExportDimensions, ratio: number): VideoExportDimensions {
  if (
    dimensions.width <= MAX_VIDEO_EXPORT_DIMENSION &&
    dimensions.height <= MAX_VIDEO_EXPORT_DIMENSION
  ) {
    return dimensions
  }

  const fitted = fitToAspect(MAX_VIDEO_EXPORT_DIMENSION, MAX_VIDEO_EXPORT_DIMENSION, ratio)
  return {
    width: nearestEven(fitted.width),
    height: nearestEven(fitted.height),
  }
}

export function videoExportAspectRatio(
  canvas: VideoExportDimensions,
  aspect: readonly [number, number],
): number {
  const configuredRatio = aspect[0] / aspect[1]
  if (aspect[0] > 0 && aspect[1] > 0 && Number.isFinite(configuredRatio)) return configuredRatio

  const canvasRatio = canvas.width / canvas.height
  return Number.isFinite(canvasRatio) && canvasRatio > 0 ? canvasRatio : 1
}

export function closestVideoExportDimensions(
  target: VideoExportDimensions,
  ratio: number,
): VideoExportDimensions {
  const widthBased = fitWithinMaximum(dimensionsFromWidth(target.width, ratio), ratio)
  const heightBased = fitWithinMaximum(dimensionsFromHeight(target.height, ratio), ratio)
  const score = (dimensions: VideoExportDimensions) =>
    Math.abs(dimensions.width - target.width) + Math.abs(dimensions.height - target.height)

  return score(widthBased) <= score(heightBased) ? widthBased : heightBased
}

export function createVideoExportResolutionOptions(
  canvas: VideoExportDimensions,
  aspect: readonly [number, number],
): VideoExportResolutionOption[] {
  const ratio = videoExportAspectRatio(canvas, aspect)
  const current = closestVideoExportDimensions(canvas, ratio)
  const adjusted = current.width !== canvas.width || current.height !== canvas.height
  const currentLabel = adjusted
    ? `Current - ${current.width} x ${current.height} (adjusted from ${canvas.width} x ${canvas.height})`
    : `Current - ${current.width} x ${current.height}`
  const options: VideoExportResolutionOption[] = [
    {
      ...current,
      label: currentLabel,
      value: `${current.width}x${current.height}`,
    },
  ]

  for (const shortEdge of commonShortEdges) {
    const dimensions =
      ratio >= 1 ? dimensionsFromHeight(shortEdge, ratio) : dimensionsFromWidth(shortEdge, ratio)
    const fitted = fitWithinMaximum(dimensions, ratio)
    const value = `${fitted.width}x${fitted.height}`
    if (options.some((option) => option.value === value)) continue

    options.push({
      ...fitted,
      label: `${fitted.width} x ${fitted.height}`,
      value,
    })
  }

  return options
}

export function resizeVideoExportFromWidth(width: number, ratio: number): VideoExportDimensions {
  return fitWithinMaximum(dimensionsFromWidth(width, ratio), ratio)
}

export function resizeVideoExportFromHeight(height: number, ratio: number): VideoExportDimensions {
  return fitWithinMaximum(dimensionsFromHeight(height, ratio), ratio)
}
