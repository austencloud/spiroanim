// Version 4 stores Move as Plane, Arc, and Distance instead of Cartesian X/Y/Z coordinates and
// adds the inheritable Travel rendering flag. This version remains unpublished while in progress.

import { CHARSET } from '@/services/query/versions/SpiroAnimQSv3'
import { VDEF as LEGACY_VDEF } from '@/services/query/versions/SpiroAnimQSv1'

import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export { CHARSET }

export const VDEF = {
  ...LEGACY_VDEF,
  move: [0, 62, 6],
} satisfies Record<AllVars, VDefEntry>

export function createRootConfig(): ConfigData<AllVars> {
  return [
    [
      'bits',
      5,
      ['bpm', 'color', 'prop', 'guides', 'anchors', 'nodes', 'paths', 'hands', 'visible'],
    ],
    ['bits', 4, ['aspectx', 'aspecty', 'distance', 'thick', 'arms']],
    ['bits', 1, ['travel']],
  ]
}

export function createPropConfig(): ConfigData<AllVars> {
  return [
    ['bits', 3, ['guides', 'anchors', 'nodes', 'paths', 'hands', 'visible', 'color']],
    ['bits', 2, ['prop', 'arms', 'travel']],
    [
      'anim',
      16,
      [
        ['bits', 3, ['plane', 'arc']],
        ['bits', 2, ['turns']],
        ['bits', 2, ['type', 'axis']],
        ['bits', 1, ['beats']],
        ['bits', 1, ['scale']],
        ['bits', 1, ['depth']],
        ['bits', 2, ['adjust']],
        ['move', 4],
      ],
    ],
  ]
}
