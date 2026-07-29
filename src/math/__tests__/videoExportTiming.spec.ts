import { describe, expect, it } from 'vitest'

import { videoExportFrameCount, videoExportFrameTimeMs } from '@/math/videoExportTiming'

describe('video export timing', () => {
  it('adds a held endpoint frame after a frame-aligned animation', () => {
    const totalFrames = videoExportFrameCount(1000, 60)

    expect(totalFrames).toBe(61)
    expect(videoExportFrameTimeMs(59, totalFrames, 1000, 60)).toBeCloseTo(983.333)
    expect(videoExportFrameTimeMs(60, totalFrames, 1000, 60)).toBe(1000)
  })

  it('renders the exact endpoint after a non-frame-aligned animation', () => {
    const totalFrames = videoExportFrameCount(1010, 60)

    expect(totalFrames).toBe(62)
    expect(videoExportFrameTimeMs(60, totalFrames, 1010, 60)).toBe(1000)
    expect(videoExportFrameTimeMs(61, totalFrames, 1010, 60)).toBe(1010)
  })

  it('exports a single endpoint frame for a zero-duration animation', () => {
    const totalFrames = videoExportFrameCount(0, 60)

    expect(totalFrames).toBe(1)
    expect(videoExportFrameTimeMs(0, totalFrames, 0, 60)).toBe(0)
  })
})
