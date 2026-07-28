import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { vtgAnimationPreset } from '@/features/vtg/data/vtgAnimationPreset'
import { encodeReadable } from '@/services/animation/AnimReadableFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('vtgAnimationPreset', () => {
  it('matches the readable form of its source v1 query', async () => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const decoded = queryCodec.decodeQS({
      r: 'Ew09APi99',
      p0: 'N--.mD------u.bn-...',
      p1: 'S--.05ExM---u.bn-s8...bn-',
      v: '1',
    })

    expect(vtgAnimationPreset).toEqual(encodeReadable(decoded))
  })
})
