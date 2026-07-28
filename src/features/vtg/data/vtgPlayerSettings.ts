import type { VtgReadableAnimation } from '@/features/vtg/types'
import type { AnimReadable, PropReadable } from '@/types/AnimTypes'

export const vtgBpmControl = {
  min: 40,
  max: 140,
  step: 1,
  default: 120,
} as const

export const vtgScaleControl = {
  min: 0.6,
  max: 1.4,
  step: 0.1,
  default: 0.8,
  distanceMin: 18,
  distanceMax: 30,
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const clampVtgBpm = (bpm: number) => clamp(bpm, vtgBpmControl.min, vtgBpmControl.max)

export const toVtgInternalScale = (scale: number) =>
  Math.round(clamp(scale, vtgScaleControl.min, vtgScaleControl.max) * 10)

export const getVtgDistanceForScale = (scale: number) => {
  const clampedScale = clamp(scale, vtgScaleControl.min, vtgScaleControl.max)
  const progress =
    (clampedScale - vtgScaleControl.min) / (vtgScaleControl.max - vtgScaleControl.min)

  const distance =
    vtgScaleControl.distanceMin +
    progress * (vtgScaleControl.distanceMax - vtgScaleControl.distanceMin)

  return Math.round(distance * 100) / 100
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
  visible: true,
  aspectx: 1,
  aspecty: 1,
  distance: getVtgDistanceForScale(vtgScaleControl.default),
  thick: 4,
} satisfies Omit<VtgReadableAnimation, 'props'>

export const vtgBaseFrameSettings = {
  scale: toVtgInternalScale(vtgScaleControl.default),
} satisfies AnimReadable

export const vtgPropSettings = [{ color: 'Green' }, { color: 'Orange' }] satisfies readonly Omit<
  PropReadable,
  'anim'
>[]
