import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { getVtgPatternDefinition } from '@/features/vtg/data/vtgPatternCatalog'
import { encodeReadable } from '@/services/animation/AnimReadableFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { AnimReadable } from '@/types/AnimTypes'

const withoutScale = (frames: readonly AnimReadable[]) =>
  frames.map(({ scale: _scale, ...frame }) => frame)

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
    {
      reference: '1-5',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.blE.blEs8...',
    },
    {
      reference: '2-5',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.biQ.blEs8...',
    },
    {
      reference: '1-4',
      r: 'Ew09APi11',
      p0: 'N--.blE.blEs8...',
      p1: 'S--.blE.bn-s8...',
    },
    {
      reference: '2-4',
      r: 'Ew09APi11',
      p0: 'N--.blE.blEs8...',
      p1: 'S--.biQ.bn-s8...',
    },
  ] as const)('decodes replacement $reference', async ({ reference, r, p0, p1 }) => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const readable = encodeReadable(queryCodec.decodeQS({ r, p0, p1, v: '1' }))
    const selection = { reference, speedRatio: '1:1' } as const
    const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.(selection)

    expect(pattern?.props.map((prop) => prop.anim)).toEqual(
      readable.props.map((prop) => withoutScale(prop.anim.slice(0, 2))),
    )
  })

  it.each([
    {
      reference: '3-6',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.blExM.bn-s8...',
    },
    {
      reference: '4-6',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.bn-xM.bn-s8...',
    },
    {
      reference: '3-5',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.blExM.blEs8...',
    },
    {
      reference: '4-5',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.bn-xM.blEs8...',
    },
    {
      reference: '3-4',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.blExM.biQuY...',
    },
    {
      reference: '4-4',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.bn-xM.bn-uY...',
    },
  ] as const)('decodes the replacement $reference', async ({ reference, p0, p1 }) => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const decoded = queryCodec.decodeQS({
      r: 'Ew09APi11',
      p0,
      p1,
      v: '1',
    })
    const readable = encodeReadable(decoded)
    const selection = { reference, speedRatio: '1:1' } as const
    const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.(selection)

    expect(pattern?.props.map((prop) => prop.anim)).toEqual(
      readable.props.map((prop) => withoutScale(prop.anim.slice(0, 2))),
    )
  })

  it.each([
    {
      reference: '5-6',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.bn-.bn-...',
      p1: 'S--.bn-xM.blEuY...',
    },
    {
      reference: '5-6',
      mode: 'Anti',
      isAnti: true,
      p0: 'N--.bn-.bn-s8...',
      p1: 'S--.bn-xM.blEs8...',
    },
    {
      reference: '5-5',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.bn-.bn-...',
      p1: 'S--.bn-xM.bn-uY...',
    },
    {
      reference: '5-5',
      mode: 'Anti',
      isAnti: true,
      p0: 'N--.bn-.blEs8...',
      p1: 'S--.bn-xM.blEs8...',
    },
    {
      reference: '5-4',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.bn-.bn-s8...',
      p1: 'S--.bn-xM.blEuY...',
    },
  ] as const)(
    'decodes the $mode replacement for $reference',
    async ({ reference, isAnti, p0, p1 }) => {
      const version = await loadSpiroAnimQSVersion(1)
      const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
      const readable = encodeReadable(
        queryCodec.decodeQS({
          r: 'Ew09APi11',
          p0,
          p1,
          v: '1',
        }),
      )
      const selection = { reference, speedRatio: '1:1', isAnti } as const
      const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.(selection)

      expect(pattern?.props.map((prop) => prop.anim)).toEqual(
        readable.props.map((prop) => withoutScale(prop.anim.slice(0, 2))),
      )
    },
  )

  it.each([
    {
      reference: '6-6',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.blExM.blEuY...',
      p1: 'S--.bn-.bn-uY...',
    },
    {
      reference: '6-6',
      mode: 'Anti',
      isAnti: true,
      p0: 'N--.blExM.blEs8...',
      p1: 'S--.bn-.bn-s8...',
    },
    {
      reference: '6-5',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.blExM.bn-uY...',
      p1: 'S--.bn-.bn-uY...',
    },
    {
      reference: '6-5',
      mode: 'Anti',
      isAnti: true,
      p0: 'N--.blExM.bn-s8...',
      p1: 'S--.bn-.bn-s8...',
    },
    {
      reference: '6-4',
      mode: 'Spin',
      isAnti: false,
      p0: 'N--.blExM.blEuY...',
      p1: 'S--.bn-.bn-s8...',
    },
  ] as const)(
    'decodes the $mode replacement for $reference',
    async ({ reference, isAnti, p0, p1 }) => {
      const version = await loadSpiroAnimQSVersion(1)
      const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
      const readable = encodeReadable(
        queryCodec.decodeQS({
          r: 'Ew09APi11',
          p0,
          p1,
          v: '1',
        }),
      )
      const selection = { reference, speedRatio: '1:1', isAnti } as const
      const pattern = getVtgPatternDefinition(selection)?.patternsBySpeedRatio['1:1']?.(selection)
      const readableProps = [...readable.props].reverse()

      expect(pattern?.props.map((prop) => prop.anim)).toEqual(
        readableProps.map((prop) => withoutScale(prop.anim.slice(0, 2))),
      )
    },
  )
})
