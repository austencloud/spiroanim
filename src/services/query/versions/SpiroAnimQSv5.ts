// Version 5 adds the root-owned Camera track and removes the global camera Distance field.

import {
  CHARSET,
  VDEF,
  createMotionConfig,
  createPropConfig,
  createRootConfig as createLegacyRootConfig,
  decodeMotionFrame,
  encodeMotionFrame,
} from '@/services/query/versions/SpiroAnimQSv4'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'
import type { AllVars } from '@/types/AnimTypes'

export { CHARSET, VDEF, createMotionConfig, createPropConfig, decodeMotionFrame, encodeMotionFrame }

export function createRootConfig(): ConfigData<AllVars> {
  const config = structuredClone(createLegacyRootConfig())
  const settings = config[1]
  if (settings?.[0] === 'bits' && Array.isArray(settings[2])) {
    settings[1] = 3
    settings[2] = settings[2].filter((key) => key !== 'distance')
  }
  return config
}

export const createCameraConfig = createMotionConfig
