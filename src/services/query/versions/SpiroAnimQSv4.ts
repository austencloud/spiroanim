// Version 4 separates per-prop Motion frames from the base Animation frame stream.

import { CHARSET } from '@/services/query/versions/SpiroAnimQSv3'
import {
  VDEF,
  createRootConfig,
  createPropConfig as createLegacyPropConfig,
} from '@/services/query/versions/SpiroAnimQSv2'

import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export { CHARSET, VDEF, createRootConfig }

export function createPropConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyPropConfig())
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
      4,
      [
        ['bits', 1, ['beats']],
        ['move', 3],
      ],
    ],
  ]
}
