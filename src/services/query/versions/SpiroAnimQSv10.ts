// Version 10 moves Beats, Scale, and Depth into an optional per-prop extended Animation track and
// adds inherited Twist in that track. The separate xN values avoid emitting the base Animation
// groups that precede frequently authored extended values.

import {
  CHARSET,
  VDEF as LEGACY_VDEF,
  createCameraConfig,
  createMotionConfig,
  createPropConfig as createLegacyPropConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
  omitEmptyCameraCenter,
  omitStandaloneMotionPrefix,
} from '@/services/query/versions/SpiroAnimQSv9'
import { TWIST_INCREMENT, TWIST_MAX, TWIST_MIN } from '@/domain/animation/AnimStruct'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { QueryValueCodec } from '@/services/query/types/BaseQueryCodecTypes'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export {
  CHARSET,
  createCameraConfig,
  createMotionConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
  omitEmptyCameraCenter,
  omitStandaloneMotionPrefix,
}

export const TWIST_QUERY_CODEC: QueryValueCodec = {
  encode: (value) => Math.round(value / TWIST_INCREMENT),
  decode: (value) => value * TWIST_INCREMENT,
}

export const VDEF = {
  ...LEGACY_VDEF,
  twist: [TWIST_MIN, TWIST_MAX, 5, TWIST_QUERY_CODEC],
} satisfies Record<AllVars, VDefEntry>

export function createPropConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyPropConfig())
  const animation = config.at(-1)

  if (animation?.[0] === 'anim') {
    animation[1] = 9
    animation[2] = animation[2].filter(
      (item) =>
        item[0] !== 'bits' ||
        !Array.isArray(item[2]) ||
        !item[2].some((key) => key === 'beats' || key === 'scale' || key === 'depth'),
    )
  }

  return config
}

export function createExtendedAnimationConfig(): ConfigData<AllVars> {
  return [
    [
      'anim',
      4,
      [
        ['bits', 3, ['beats', 'scale', 'depth']],
        ['bits', 1, ['twist']],
      ],
    ],
  ]
}
