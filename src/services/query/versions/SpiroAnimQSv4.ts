// Version 4 separates per-prop Motion frames from the base Animation frame stream.

import { CHARSET } from '@/services/query/versions/SpiroAnimQSv3'
import {
  VDEF as LEGACY_VDEF,
  createRootConfig as createLegacyRootConfig,
  createPropConfig as createLegacyPropConfig,
} from '@/services/query/versions/SpiroAnimQSv2'

import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { AllVars, MotionData } from '@/types/AnimTypes'

export { CHARSET }

export const VDEF = {
  ...LEGACY_VDEF,
  travel: [0, 1, 2, Boolean],
  shape: [0, 2, 2],
  amount: [0, 100, 7],
} satisfies Record<AllVars, VDefEntry>

export function createRootConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyRootConfig())
  config.push(['bits', 1, ['travel']])
  return config
}

export function createPropConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyPropConfig())
  const propFlags = config[1]
  if (propFlags?.[0] === 'bits' && Array.isArray(propFlags[2])) {
    propFlags[1] = 2
    propFlags[2].push('travel')
  }
  const animation = config.at(-1)
  if (animation?.[0] === 'anim') {
    animation[1] = 12
    animation[2] = animation[2].filter((item) => item[0] !== 'move')
  }
  return config
}

export function createMotionConfig(): ConfigData<AllVars> {
  return [
    [
      'anim',
      9,
      [
        ['bits', 3, ['beats', 'distance', 'shape']],
        ['bits', 3, ['arc', 'plane']],
        ['bits', 3, ['axis', 'amount']],
      ],
    ],
  ]
}

// Motion reuses the established Arc and Distance definitions without changing their Animation or
// camera contracts. The serialized Motion representation normalizes signed Arc and zero-based
// Distance into those existing ranges.
export function encodeMotionFrame(frame: MotionData): MotionData {
  return {
    ...frame,
    arc: frame.arc === undefined ? undefined : ((frame.arc % 360) + 360) % 360,
    distance: frame.distance === undefined ? undefined : frame.distance + 4,
  }
}

export function decodeMotionFrame(frame: MotionData): MotionData {
  const arc = frame.arc
  return {
    ...frame,
    arc: arc === undefined ? undefined : arc > 180 ? arc - 360 : arc,
    distance: frame.distance === undefined ? undefined : frame.distance - 4,
  }
}
