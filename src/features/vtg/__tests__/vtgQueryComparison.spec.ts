import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { getVtgPatternDefinition } from '@/features/vtg/data/vtgPatternCatalog'
import { encodeReadable } from '@/services/animation/AnimReadableFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('VTG query references', () => {
  it.each([
    {
      reference: '1-6',
      r: 'Ew09APi11',
      p0: 'N--.bg0-----u.blE...',
      p1: 'S--.blE-----u.bn-s8...',
    },
    {
      reference: '2-6',
      r: 'Ew09APi11',
      p0: 'N--.bg0-----u.blE...',
      p1: 'S--.biQ.bn-s8...',
    },
  ] as const)('decodes replacement $reference', async ({ reference, r, p0, p1 }) => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const readable = encodeReadable(queryCodec.decodeQS({ r, p0, p1, v: '1' }))
    const selection = { reference, speedRatio: '1:1' } as const
    const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.()

    expect(pattern?.props.map((prop) => prop.anim)).toEqual(
      readable.props.map((prop) => prop.anim.slice(0, 2)),
    )
  })

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
    const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.()

    expect(pattern?.props.map((prop) => prop.anim)).toEqual(
      readable.props.map((prop) => prop.anim.slice(0, 2)),
    )
  })
})
