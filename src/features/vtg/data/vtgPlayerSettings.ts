import type { VtgReadableAnimation } from '@/features/vtg/types'
import type { AnimReadable, PropReadable } from '@/types/AnimTypes'

export const vtgBpmControl = {
  min: 40,
  max: 140,
  step: 1,
  default: 40,
} as const

export const vtgScaleControl = {
  min: 0.5,
  max: 1.4,
  step: 0.1,
  default: 0.8,
  distanceMin: 14,
  distancePivotScale: 0.6,
  distancePivot: 15,
  distanceMax: 25,
} as const

export const vtgThickControl = {
  min: 1,
  max: 15,
  step: 1,
  default: 5,
} as const

export const vtgSpacingControl = {
  min: 0,
  max: 20,
  step: 1,
  default: 1,
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const clampVtgBpm = (bpm: number) => clamp(bpm, vtgBpmControl.min, vtgBpmControl.max)

export const toVtgInternalScale = (scale: number) =>
  Math.round(clamp(scale, vtgScaleControl.min, vtgScaleControl.max) * 10)

export const getVtgDistanceForScale = (scale: number) => {
  const clampedScale = clamp(scale, vtgScaleControl.min, vtgScaleControl.max)
  const belowPivot = clampedScale <= vtgScaleControl.distancePivotScale
  const scaleStart = belowPivot ? vtgScaleControl.min : vtgScaleControl.distancePivotScale
  const scaleEnd = belowPivot ? vtgScaleControl.distancePivotScale : vtgScaleControl.max
  const distanceStart = belowPivot ? vtgScaleControl.distanceMin : vtgScaleControl.distancePivot
  const distanceEnd = belowPivot ? vtgScaleControl.distancePivot : vtgScaleControl.distanceMax
  const progress = (clampedScale - scaleStart) / (scaleEnd - scaleStart)

  const distance = distanceStart + progress * (distanceEnd - distanceStart)

  return Math.round(distance)
}

export const vtgPlayerSettings = {
  speed: 1,
  type: 0,
  turns: 0,
  depth: 0,
  bpm: vtgBpmControl.default,
  color: 'Green',
  prop: 'POI',
  guides: false,
  anchors: false,
  nodes: false,
  paths: true,
  hands: false,
  arms: true,
  visible: true,
  aspectx: 1,
  aspecty: 1,
  distance: getVtgDistanceForScale(vtgScaleControl.default),
  thick: vtgThickControl.default,
} satisfies Omit<VtgReadableAnimation, 'props'>

export const vtgBaseFrameSettings = {
  scale: toVtgInternalScale(vtgScaleControl.default),
} satisfies AnimReadable

export const vtgPropSettings = [{ color: 'Cyan' }, { color: 'Green' }] satisfies readonly Omit<
  PropReadable,
  'anim'
>[]
