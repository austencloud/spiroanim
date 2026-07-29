export interface AspectFit {
  width: number
  height: number
  mode: 0 | 1 | 2
}

/**
 * Fits an aspect ratio inside maximum dimensions.
 *
 * Mode 0 means the dimensions already match within tolerance, mode 1 is
 * height-limited, and mode 2 is width-limited.
 */
export function fitToAspect(maxWidth: number, maxHeight: number, aspectRatio: number): AspectFit {
  const actualRatio = maxWidth / maxHeight
  const diff = Math.abs(actualRatio - aspectRatio)

  if (diff < 0.01) {
    return {
      width: maxWidth,
      height: maxHeight,
      mode: 0,
    }
  }

  const heightBasedWidth = maxHeight * aspectRatio
  if (heightBasedWidth <= maxWidth) {
    return {
      width: heightBasedWidth,
      height: maxHeight,
      mode: 1,
    }
  }

  return {
    width: maxWidth,
    height: maxWidth / aspectRatio,
    mode: 2,
  }
}
