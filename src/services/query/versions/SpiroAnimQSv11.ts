// Version 11 adds a separate per-prop Rotation Animation track. Yaw, Rotate, and Twist fit in one
// 29-bit group so frequently authored combinations remain compact without padding the xN track.
// Packed fields are declared in reverse display order because the query codec writes the first
// field into the least-significant bits, which appear on the right of the radix-64 text.

import {
  CHARSET,
  VDEF as LEGACY_VDEF,
  WHOLE_DEGREE_QUERY_CODEC,
  createCameraConfig,
  createMotionConfig,
  createPropConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
  omitEmptyCameraCenter,
  omitStandaloneMotionPrefix,
} from '@/services/query/versions/SpiroAnimQSv10'
import { ROTATE_MAX, ROTATE_MIN, YAW_MAX, YAW_MIN } from '@/domain/animation/AnimStruct'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export {
  CHARSET,
  createCameraConfig,
  createMotionConfig,
  createPropConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
  omitEmptyCameraCenter,
  omitStandaloneMotionPrefix,
}

export const VDEF = {
  ...LEGACY_VDEF,
  yaw: [YAW_MIN, YAW_MAX, 9, WHOLE_DEGREE_QUERY_CODEC],
  rotate: [ROTATE_MIN, ROTATE_MAX, 10, WHOLE_DEGREE_QUERY_CODEC],
} satisfies Record<AllVars, VDefEntry>

export function createExtendedAnimationConfig(): ConfigData<AllVars> {
  return [['anim', 3, [['bits', 3, ['beats', 'scale', 'depth']]]]]
}

export function createRotationAnimationConfig(): ConfigData<AllVars> {
  return [['anim', 5, [['bits', 5, ['twist', 'rotate', 'yaw']]]]]
}
