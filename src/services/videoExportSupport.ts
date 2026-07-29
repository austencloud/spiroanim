import type { VideoExportContainer } from '@/types/VideoExportTypes'

export interface VideoExportCodec {
  codec: string
  container: VideoExportContainer
  label: string
  supportsAlpha: boolean
}

export interface VideoExportProbeSettings {
  width: number
  height: number
  framerate: number
  bitrate: number
}

interface VideoExportCodecFamily {
  codecs: readonly string[]
  container: VideoExportCodec['container']
  label: string
}

const codecFamilies: readonly VideoExportCodecFamily[] = [
  {
    // Prefer the lowest H.264 High-profile level that can represent the requested configuration,
    // then fall back to Main and Baseline profiles for devices with narrower encoder support.
    codecs: [
      'avc1.64001f',
      'avc1.640028',
      'avc1.64002a',
      'avc1.640034',
      'avc1.4d002a',
      'avc1.42002a',
    ],
    container: 'mp4',
    label: 'H.264 (MP4)',
  },
  {
    codecs: ['hvc1.1.6.L93.B0', 'hvc1.1.6.L123.B0', 'hvc1.1.6.L153.B0'],
    container: 'mp4',
    label: 'HEVC / H.265 (MP4)',
  },
  {
    codecs: ['vp8'],
    container: 'webm',
    label: 'VP8 (WebM)',
  },
  {
    codecs: ['vp09.00.10.08', 'vp09.00.40.08', 'vp09.00.50.08'],
    container: 'webm',
    label: 'VP9 (WebM)',
  },
  {
    codecs: ['av01.0.04M.08', 'av01.0.08M.08', 'av01.0.12M.08'],
    container: 'webm',
    label: 'AV1 (WebM)',
  },
]

export function hasVideoExportApi(): boolean {
  return typeof VideoFrame !== 'undefined' && typeof VideoEncoder !== 'undefined'
}

export async function probeVideoExportCodecs(
  settings: VideoExportProbeSettings,
): Promise<VideoExportCodec[]> {
  if (!hasVideoExportApi()) return []

  async function supports(codec: string, alpha: AlphaOption): Promise<boolean> {
    try {
      const result = await VideoEncoder.isConfigSupported({
        codec,
        width: settings.width,
        height: settings.height,
        framerate: settings.framerate,
        bitrate: settings.bitrate,
        bitrateMode: 'variable',
        latencyMode: 'quality',
        alpha,
      })
      return result.supported === true
    } catch {
      return false
    }
  }

  const results = await Promise.all(
    codecFamilies.map(async (family) => {
      const familyResults = await Promise.all(
        family.codecs.map((codec) => supports(codec, 'discard')),
      )
      const supportedIndex = familyResults.findIndex(Boolean)
      if (supportedIndex < 0) return undefined

      const codec = family.codecs[supportedIndex]!
      return {
        codec,
        container: family.container,
        label: family.label,
        supportsAlpha:
          family.container === 'webm' &&
          codec.startsWith('vp09') &&
          (await supports(codec, 'keep')),
      }
    }),
  )

  return results.filter((codec): codec is VideoExportCodec => codec !== undefined)
}
