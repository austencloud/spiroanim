import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hasVideoExportApi,
  probeVideoExportCodecs,
  type VideoExportProbeSettings,
} from '@/services/videoExportSupport'

const settings: VideoExportProbeSettings = {
  width: 1920,
  height: 1080,
  framerate: 60,
  bitrate: 16_000_000,
}

describe('video export support', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires both VideoFrame and VideoEncoder', () => {
    vi.stubGlobal('VideoFrame', class {})
    vi.stubGlobal('VideoEncoder', undefined)

    expect(hasVideoExportApi()).toBe(false)
  })

  it('returns only codec configurations accepted by the browser', async () => {
    const isConfigSupported = vi.fn<(config: VideoEncoderConfig) => Promise<VideoEncoderSupport>>(
      async (config) => ({
        config,
        supported: config.codec === 'vp09.00.10.08',
      }),
    )
    vi.stubGlobal('VideoFrame', class {})
    vi.stubGlobal('VideoEncoder', { isConfigSupported })

    const codecs = await probeVideoExportCodecs(settings)

    expect(codecs).toEqual([
      {
        codec: 'vp09.00.10.08',
        container: 'webm',
        label: 'VP9 (WebM)',
        supportsAlpha: true,
      },
    ])
    expect(isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({ codec: 'vp09.00.10.08', alpha: 'keep' }),
    )
    expect(isConfigSupported).toHaveBeenCalledWith(expect.objectContaining({ codec: 'vp8' }))
    expect(isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({ codec: 'hvc1.1.6.L123.B0' }),
    )
    expect(isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({ codec: 'avc1.64002a' }),
    )
    expect(isConfigSupported).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1920,
        height: 1080,
        framerate: 60,
        bitrate: 16_000_000,
      }),
    )
  })

  it('lists each codec family once using its first supported configuration', async () => {
    const supportedCodecs = new Set([
      'avc1.64002a',
      'avc1.640034',
      'hvc1.1.6.L123.B0',
      'vp8',
      'vp09.00.40.08',
      'av01.0.08M.08',
    ])
    vi.stubGlobal('VideoFrame', class {})
    vi.stubGlobal('VideoEncoder', {
      isConfigSupported: vi.fn<(config: VideoEncoderConfig) => Promise<VideoEncoderSupport>>(
        async (config) => ({
          config,
          supported: supportedCodecs.has(config.codec),
        }),
      ),
    })

    await expect(probeVideoExportCodecs(settings)).resolves.toEqual([
      {
        codec: 'avc1.64002a',
        container: 'mp4',
        label: 'H.264 (MP4)',
        supportsAlpha: false,
      },
      {
        codec: 'hvc1.1.6.L123.B0',
        container: 'mp4',
        label: 'HEVC / H.265 (MP4)',
        supportsAlpha: false,
      },
      { codec: 'vp8', container: 'webm', label: 'VP8 (WebM)', supportsAlpha: false },
      {
        codec: 'vp09.00.40.08',
        container: 'webm',
        label: 'VP9 (WebM)',
        supportsAlpha: true,
      },
      {
        codec: 'av01.0.08M.08',
        container: 'webm',
        label: 'AV1 (WebM)',
        supportsAlpha: false,
      },
    ])
  })

  it('treats rejected codec probes as unavailable', async () => {
    vi.stubGlobal('VideoFrame', class {})
    vi.stubGlobal('VideoEncoder', {
      isConfigSupported: vi.fn<(config: VideoEncoderConfig) => Promise<VideoEncoderSupport>>(
        async () => {
          throw new DOMException('Unsupported configuration')
        },
      ),
    })

    await expect(probeVideoExportCodecs(settings)).resolves.toEqual([])
  })
})
