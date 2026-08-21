// Version 8 adds Juggling Clubs as prop index 2 without changing the packed layout.

import {
  CHARSET,
  VDEF as LEGACY_VDEF,
  createCameraConfig,
  createMotionConfig,
  createPropConfig,
  createRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
  omitEmptyCameraCenter,
  omitStandaloneMotionPrefix,
} from '@/services/query/versions/SpiroAnimQSv7'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
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
  prop: [0, 2, 4],
} satisfies Record<AllVars, VDefEntry>
