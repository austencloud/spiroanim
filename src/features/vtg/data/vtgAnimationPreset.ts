import type { VtgReadableAnimation } from '@/features/vtg/types'

/**
 * Based on the readable form of the v1 query:
 * ?r=Ew09APi99&p0=N--.mD------u.bn-...&p1=S--.05ExM---u.bn-s8...bn-&v=1
 *
 * This is the authoritative editable template for the first VTG pattern.
 */
export const vtgAnimationPreset = {
  speed: 1,
  type: 0,
  turns: 0,
  depth: 0,
  bpm: 60,
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
  distance: 22,
  thick: 4,
  props: [
    {
      color: 'Green',
      // prettier-ignore
      anim: [
        { plane:   0, arc: 180, turns:    0 },
        { plane:   0, arc:  90, turns:    0 },
        { plane:   0, arc:  90, turns:    0 },
        { plane:   0, arc:  90, turns:    0 },
        { plane:   0, arc:  90, turns:    0 },
      ],
    },
    {
      color: 'Cyan',
      // prettier-ignore
      anim: [
        { plane: 180, arc:   0, turns:  180 },
        { plane:   0, arc:  90, turns: -180 },
        { plane:   0, arc:  90, turns: -180 },
        { plane:   0, arc:  90, turns: -180 },
        { plane:   0, arc:  90, turns: -180 },
      ],
    },
  ],
} satisfies VtgReadableAnimation
