import type { VtgReadableAnimation } from '@/features/vtg/types'
import type { AnimReadable, PropReadable } from '@/types/AnimTypes'

export const vtgPlayerSettings = {
  speed: 1,
  type: 0,
  turns: 0,
  depth: 0,
  bpm: 120,
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
  distance: 22,
  thick: 4,
} satisfies Omit<VtgReadableAnimation, 'props'>

export const vtgBaseFrameSettings = {
  scale: 8,
} satisfies AnimReadable

export const vtgPropSettings = [{ color: 'Green' }, { color: 'Orange' }] satisfies readonly Omit<
  PropReadable,
  'anim'
>[]
