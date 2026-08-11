import { describe, expect, it } from 'vitest'

import {
  videoExportAnimationTimeMs,
  videoExportDurationMs,
  videoExportFrameCount,
  videoExportFrameTimeMs,
} from '@/math/videoExportTiming'

describe('video export timing', () => {
  it('scales the output duration and sampled animation time with playback speed', () => {
    expect(videoExportDurationMs(4000, 2)).toBe(2000)
    expect(videoExportAnimationTimeMs(1500, 2)).toBe(3000)
    expect(videoExportDurationMs(4000, 0.5)).toBe(8000)
    expect(videoExportAnimationTimeMs(6000, 0.5)).toBe(3000)
  })

  it('falls back to normal speed for an invalid playback speed', () => {
    expect(videoExportDurationMs(4000, 0)).toBe(4000)
    expect(videoExportAnimationTimeMs(1500, 0)).toBe(1500)
  })

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
