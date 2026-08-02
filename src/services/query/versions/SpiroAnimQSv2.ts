// Version 2 adds the inherited Arms flag without changing any version 1 field positions.

import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'

import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export { VDEF }

export function createRootConfig(): ConfigData<AllVars> {
  return [
    [
      'bits',
      5,
      ['bpm', 'color', 'prop', 'guides', 'anchors', 'nodes', 'paths', 'hands', 'visible'],
    ],
    ['bits', 4, ['aspectx', 'aspecty', 'distance', 'thick', 'arms']],
  ]
}

export function createPropConfig(): ConfigData<AllVars> {
  return [
    ['bits', 3, ['guides', 'anchors', 'nodes', 'paths', 'hands', 'visible', 'color']],
    ['bits', 1, ['prop', 'arms']],
    [
      'anim',
      15,
      [
        ['bits', 3, ['plane', 'arc']],
        ['bits', 2, ['turns']],
        ['bits', 2, ['type', 'axis']],
        ['bits', 1, ['beats']],
        ['bits', 1, ['scale']],
        ['bits', 1, ['depth']],
        ['bits', 2, ['adjust']],
        ['move', 3],
      ],
    ],
  ]
}
