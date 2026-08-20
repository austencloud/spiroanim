// Version 7 stores Animation Turns to one decimal place without increasing the frame length.

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
} from '@/services/query/versions/SpiroAnimQSv6'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { QueryValueCodec } from '@/services/query/types/BaseQueryCodecTypes'
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

export const TENTHS_QUERY_CODEC: QueryValueCodec = {
  encode: (value) => Math.round(value * 10),
  decode: (value) => value / 10,
}

export const VDEF = {
  ...LEGACY_VDEF,
  turns: [-1980, 1980, 16, TENTHS_QUERY_CODEC],
} satisfies Record<AllVars, VDefEntry>

export function createPropConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyPropConfig())
  const animation = config.at(-1)

  if (animation?.[0] === 'anim') {
    // Repacking the four spare V6 frame bits keeps Animation frames at 12 characters.
    animation[2] = [
      ['bits', 3, ['plane', 'arc']],
      ['bits', 3, ['turns', 'type']],
      ['bits', 3, ['axis', 'adjust']],
      ['bits', 3, ['beats', 'scale', 'depth']],
    ]
  }

  return config
}
