import { describe, expect, it } from 'vitest'

import {
  createVideoExportResolutionOptions,
  MAX_VIDEO_EXPORT_DIMENSION,
  resizeVideoExportFromHeight,
  resizeVideoExportFromWidth,
  videoExportAspectRatio,
} from '@/math/videoExportResolution'

describe('video export resolutions', () => {
  it('adjusts the current canvas to a configured aspect ratio and even dimensions', () => {
    const options = createVideoExportResolutionOptions({ width: 973, height: 550 }, [16, 9])

    expect(options[0]).toEqual({
      width: 974,
      height: 548,
      value: '974x548',
      label: 'Current - 974 x 548 (adjusted from 973 x 550)',
    })
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 1280, height: 720 }),
        expect.objectContaining({ width: 1920, height: 1080 }),
        expect.objectContaining({ width: 2560, height: 1440 }),
        expect.objectContaining({ width: 3840, height: 2160 }),
      ]),
    )
  })

  it('uses the observed canvas ratio when the configured aspect is automatic', () => {
    const ratio = videoExportAspectRatio({ width: 1000, height: 777 }, [0, 0])
    const options = createVideoExportResolutionOptions({ width: 1000, height: 777 }, [0, 0])

    expect(ratio).toBeCloseTo(1000 / 777)
    expect(options[0]!.width).toBe(1000)
    expect(options[0]!.height).toBe(778)
  })

  it('caps custom scaling when either dimension reaches the 4K-width limit', () => {
    expect(resizeVideoExportFromWidth(5000, 16 / 9)).toEqual({
      width: MAX_VIDEO_EXPORT_DIMENSION,
      height: 2160,
    })
    expect(resizeVideoExportFromHeight(5000, 9 / 16)).toEqual({
      width: 2160,
      height: MAX_VIDEO_EXPORT_DIMENSION,
    })
  })
})
