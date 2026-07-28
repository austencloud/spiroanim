import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { getVtgPatternDefinition } from '@/features/vtg/data/vtgPatternCatalog'
import { encodeReadable } from '@/services/animation/AnimReadableFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('VTG query references', () => {
  it('decodes the alternate row 1 SO/TS reference', async () => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const decoded = queryCodec.decodeQS({
      r: 'Ew09APi11',
      p0: 'N--.mD-s8---u.bn-uY...',
      p1: 'S--.05E-----u.bn-s8...',
      v: '1',
    })
    const readable = encodeReadable(decoded)
    const selection = { reference: '3-6', speedRatio: '1:1' } as const
    const pattern = getVtgPatternDefinition(selection)?.build(selection.speedRatio)

    expect(pattern?.props.map((prop) => prop.anim)).toEqual(
      readable.props.map((prop) => prop.anim.slice(0, 2)),
    )
  })
})
