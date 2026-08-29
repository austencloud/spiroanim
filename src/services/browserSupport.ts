function supportsES2022(): boolean {
  try {
    const supportsStaticBlocks = (() => {
      try {
        new Function('class Supported { static { this.value = true } }')()
        return true
      } catch {
        return false
      }
    })()

    return (
      typeof WeakRef !== 'undefined' &&
      typeof FinalizationRegistry !== 'undefined' &&
      supportsStaticBlocks
    )
  } catch {
    return false
  }
}

function supportsRendering(): boolean {
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false

    const canvas = document.createElement('canvas')
    const offscreen = new OffscreenCanvas(1, 1)

    return (
      typeof canvas.transferControlToOffscreen === 'function' &&
      canvas.getContext('webgl2') !== null &&
      offscreen.getContext('webgl2') !== null &&
      typeof offscreen.convertToBlob === 'function'
    )
  } catch {
    return false
  }
}

export function isBrowserSupported(): boolean {
  if (typeof document === 'undefined') return false

  return supportsES2022() && supportsRendering()
}
