import type { AllVars } from '@/types/AnimTypes'
import type { VDefEntry } from '@/services/query/types/BaseQSTypes'
import type { ConfigData } from '@/services/query/types/SpiroAnimQSTypes'

export interface SpiroAnimQSVersion {
  CHARSET: string
  VDEF: Record<AllVars, VDefEntry>
  createRootConfig(): ConfigData<AllVars>
  createPropConfig(): ConfigData<AllVars>
}

export class UnsupportedSpiroAnimQSVersionError extends RangeError {
  readonly version: number

  constructor(version: number) {
    super(`Unsupported SpiroAnim query-string version: ${version}`)
    this.name = 'UnsupportedSpiroAnimQSVersionError'
    this.version = version
  }
}

/**
 * Explicit version loading keeps supported formats discoverable by Vite while retaining the legacy
 * contract that older shared URLs can select their matching decoder.
 */
export async function loadSpiroAnimQSVersion(version: number): Promise<SpiroAnimQSVersion> {
  switch (version) {
    case 1:
      return import('@/services/query/versions/SpiroAnimQSv1')
    case 2:
      return import('@/services/query/versions/SpiroAnimQSv2')
    case 3:
      return import('@/services/query/versions/SpiroAnimQSv3')
    default:
      throw new UnsupportedSpiroAnimQSVersionError(version)
  }
}
