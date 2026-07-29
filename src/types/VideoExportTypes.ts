export type VideoExportContainer = 'mp4' | 'webm'

export interface VideoExportSettings {
  fileName: string
  width: number
  height: number
  framerate: number
  bitrate: number
  backgroundColor: string
  transparent: boolean
  codec: string
  container: VideoExportContainer
  durationMs: number
}

export interface VideoExportRequest {
  id: symbol
  settings: VideoExportSettings
}

export type VideoExportStatus =
  | 'idle'
  | 'rendering'
  | 'finalizing'
  | 'complete'
  | 'canceled'
  | 'error'

export interface VideoExportProgress {
  completedFrames: number
  totalFrames: number
}
