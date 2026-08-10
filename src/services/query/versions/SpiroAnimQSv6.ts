// Version 6 adds inherited Motion/Camera Precision without changing older frame layouts.

import {
  CHARSET,
  VDEF as LEGACY_VDEF,
  createMotionConfig as createLegacyMotionConfig,
  createPropConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
} from '@/services/query/versions/SpiroAnimQSv5'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export { CHARSET, createPropConfig, createRootConfig, decodeMotionFrame, encodeMotionFrame }

// A standalone mN value contains only animation frames, so it does not need the separator that
// distinguishes an embedded animation from the fields preceding it in a prop value.
export const omitStandaloneMotionPrefix = true

// Orbit already carries the Camera frame count, so an entirely empty Center track does not need a
// trailing separator. A leading separator remains necessary when Center has data but Orbit does not.
export const omitEmptyCameraCenter = true

export const VDEF = {
  ...LEGACY_VDEF,
  precision: [0, 1, 2, Boolean],
} satisfies Record<AllVars, VDefEntry>

export function createMotionConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyMotionConfig())
  const animation = config.at(-1)
  const finalGroup = animation?.[0] === 'anim' ? animation[2].at(-1) : undefined

  if (finalGroup?.[0] === 'bits' && Array.isArray(finalGroup[2])) {
    // Precision is the final packed value, so its two high bits occupy the beginning of the final
    // three-character Motion segment without increasing the frame length.
    finalGroup[2].push('precision')
  }

  return config
}

export const createCameraConfig = createMotionConfig
