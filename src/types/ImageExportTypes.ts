export type ImageExportFileType = 'image/png' | 'image/jpeg' | 'image/webp'
export type ImageExportFeature = 'paths' | 'hands' | 'visible' | 'nodes' | 'anchors' | 'guides'
export type ImageExportFeatureAvailability = Record<ImageExportFeature, boolean>

export interface ImageExportSettings {
  width: number
  height: number
  backgroundColor: string
  transparent: boolean
  fileType: ImageExportFileType
  quality: number
  hiddenFeatures: ImageExportFeature[]
}

export interface ImageExportRequest {
  id: symbol
  settings: ImageExportSettings
}
