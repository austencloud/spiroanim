import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import type { VtgCellReference } from '@/features/vtg/types'
import { encodeReadable } from '@/services/animation/AnimReadableFunc'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { AnimReadable } from '@/types/AnimTypes'

const effectiveFrames = (frames: readonly AnimReadable[]) => {
  let arc = 0
  let turns = 0

  return frames.map(({ scale: _scale, ...frame }) => {
    arc = frame.arc ?? arc
    turns = frame.turns ?? turns
    return { ...frame, plane: frame.plane ?? 0, arc, turns }
  })
}

const ratioIndependentFrames = (frames: readonly AnimReadable[]) =>
  effectiveFrames(frames).map((frame, index) => {
    if (index === 0) return frame
    const { turns: _turns, ...ratioIndependentFrame } = frame
    return ratioIndependentFrame
  })

const transposeReference = (reference: VtgCellReference): VtgCellReference => {
  const [column, row] = reference.split('-')
  return `${row}-${column}` as VtgCellReference
}

describe('VTG query references', () => {
  it.each([
    {
      reference: '1-4',
      p0: 'N--.blE-----s.blEmw...',
      p1: 'S--.blE-----s.bn-mw...',
    },
    {
      reference: '3-4',
      p0: 'N--.blEs8---s.blEAA...',
      p1: 'S--.blExM---s.biQAA...',
    },
    {
      reference: '5-4',
      p0: 'N--.bn------s.bn-mw...',
      p1: 'S--.bn-xM---s.blEAA...',
    },
    {
      reference: '1-2',
      p0: 'N--.blE-----s.blEAA...',
      p1: 'S--.blE-----s.bn-AA...',
    },
    {
      reference: '3-2',
      p0: 'N--.blEs8---s.blEmw...',
      p1: 'S--.blExM---s.bn-mw...',
    },
    {
      reference: '5-2',
      p0: 'N--.bn------s.bn-AA...',
      p1: 'S--.bn-xM---s.blEmw...',
    },
  ] as const)('decodes the 1:5 values for $reference', async ({ reference, p0, p1 }) => {
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
    const pattern = buildVtgPattern({ reference: transposeReference(reference), speedRatio: '1:5' })

    expect(pattern?.props.map((prop) => ratioIndependentFrames(prop.anim))).toEqual(
      readable.props.map((prop) => ratioIndependentFrames(prop.anim.slice(0, 2))),
    )
  })

  it.each([
    {
      reference: '1-6',
      p0: 'N--.blE.blExM...',
      p1: 'S--.blE.bn-pk...',
    },
    {
      reference: '1-5',
      p0: 'N--.blE.blExM...',
      p1: 'S--.blE.blEpk...',
    },
    {
      reference: '1-4',
      p0: 'N--.blE.blExM...',
      p1: 'S--.blE.bn-xM...',
    },
    {
      reference: '1-3',
      p0: 'N--.blE.blExM...',
      p1: 'S--.blE.blExM...',
    },
    {
      reference: '1-2',
      p0: 'N--.blE.blEpk...',
      p1: 'S--.blE.bn-pk...',
    },
    {
      reference: '1-1',
      p0: 'N--.blE.blEpk...',
      p1: 'S--.blE.blEpk...',
    },
    {
      reference: '2-6',
      p0: 'N--.blE.blExM...',
      p1: 'S--.biQ.bn-pk...',
    },
    {
      reference: '2-5',
      p0: 'N--.blE.blExM...',
      p1: 'S--.biQ.blEpk...',
    },
    {
      reference: '2-4',
      p0: 'N--.blE.blExM...',
      p1: 'S--.biQ.bn-xM...',
    },
    {
      reference: '2-3',
      p0: 'N--.blE.blExM...',
      p1: 'S--.biQ.blExM...',
    },
    {
      reference: '2-2',
      p0: 'N--.blE.blEpk...',
      p1: 'S--.biQ.bn-pk...',
    },
    {
      reference: '2-1',
      p0: 'N--.blE.blEpk...',
      p1: 'S--.biQ.blEpk...',
    },
    {
      reference: '3-6',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.blExM.bn-pk...',
    },
    {
      reference: '3-5',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.blExM.blEpk...',
    },
    {
      reference: '3-4',
      p0: 'N--.blEs8.blEpk...',
      p1: 'S--.blExM.biQpk...',
    },
    {
      reference: '3-3',
      p0: 'N--.blEs8.blEpk...',
      p1: 'S--.blExM.blEpk...',
    },
    {
      reference: '3-2',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.blExM.bn-xM...',
    },
    {
      reference: '3-1',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.blExM.blExM...',
    },
    {
      reference: '4-6',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.bn-xM.bn-pk...',
    },
    {
      reference: '4-5',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.bn-xM.blEpk...',
    },
    {
      reference: '4-4',
      p0: 'N--.blEs8.blEpk...',
      p1: 'S--.bn-xM.bn-pk...',
    },
    {
      reference: '4-3',
      p0: 'N--.blEs8.blEpk...',
      p1: 'S--.bn-xM.blEpk...',
    },
    {
      reference: '4-2',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.bn-xM.bn-xM...',
    },
    {
      reference: '4-1',
      p0: 'N--.blEs8.blExM...',
      p1: 'S--.bn-xM.blExM...',
    },
    {
      reference: '5-6',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.bn-xM.blExM...',
    },
    {
      reference: '5-6',
      isAnti: true,
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.bn-xM.blEpk...',
    },
    {
      reference: '5-5',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.bn-xM.bn-xM...',
    },
    {
      reference: '5-5',
      isAnti: true,
      p0: 'N--.bn-.blEpk...',
      p1: 'S--.bn-xM.blEpk...',
    },
    {
      reference: '5-4',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.bn-xM.blEpk...',
    },
    {
      reference: '5-3',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.bn-xM.bn-pk...',
    },
    {
      reference: '5-2',
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.bn-xM.blExM...',
    },
    {
      reference: '5-1',
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.bn-xM.bn-xM...',
    },
    {
      reference: '6-6',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.blExM.blExM...',
    },
    {
      reference: '6-6',
      isAnti: true,
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.blExM.blEpk...',
    },
    {
      reference: '6-5',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.blExM.bn-xM...',
    },
    {
      reference: '6-5',
      isAnti: true,
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.blExM.bn-pk...',
    },
    {
      reference: '6-4',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.blExM.blEpk...',
    },
    {
      reference: '6-3',
      p0: 'N--.bn-.bn-xM...',
      p1: 'S--.blExM.bn-pk...',
    },
    {
      reference: '6-2',
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.blExM.blExM...',
    },
    {
      reference: '6-1',
      p0: 'N--.bn-.bn-pk...',
      p1: 'S--.blExM.bn-xM...',
    },
  ] as const)('decodes the 1:3 values for $reference', async (query) => {
    const { reference, p0, p1 } = query
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
    const selection = {
      reference: transposeReference(reference),
      speedRatio: '1:3',
      isAnti: 'isAnti' in query && query.isAnti,
    } as const
    const pattern = buildVtgPattern(selection)

    expect(pattern?.props.map((prop) => effectiveFrames(prop.anim))).toEqual(
      readable.props.map((prop) => effectiveFrames(prop.anim.slice(0, 2))),
    )
  })

  it.each([
    {
      reference: '1-6',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.blE.bn-s8...',
    },
    {
      reference: '2-6',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
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
    {
      reference: '1-3',
      r: 'Ew09APi11',
      p0: 'N--.blE.blEs8...',
      p1: 'S--.blE.blEs8...',
    },
    {
      reference: '2-3',
      r: 'Ew09APi11',
      p0: 'N--.blE.blEs8...',
      p1: 'S--.biQ.blEs8...',
    },
    {
      reference: '1-2',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.blE.bn-...',
    },
    {
      reference: '2-2',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.biQ.bn-...',
    },
    {
      reference: '1-1',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.blE.blE...',
    },
    {
      reference: '2-1',
      r: 'Ew09APi11',
      p0: 'N--.blE.blE...',
      p1: 'S--.biQ.blE...',
    },
  ] as const)('decodes replacement $reference', async ({ reference, r, p0, p1 }) => {
    const version = await loadSpiroAnimQSVersion(1)
    const queryCodec = await useSpiroAnimQS(version.VDEF, useBaseQS(version.VDEF), 1)
    const readable = encodeReadable(queryCodec.decodeQS({ r, p0, p1, v: '1' }))
    const selection = { reference: transposeReference(reference), speedRatio: '1:1' } as const
    const pattern = buildVtgPattern(selection)

    expect(pattern?.props.map((prop) => ratioIndependentFrames(prop.anim))).toEqual(
      readable.props.map((prop) => ratioIndependentFrames(prop.anim.slice(0, 2))),
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
    {
      reference: '3-3',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.blExM.blEuY...',
    },
    {
      reference: '4-3',
      p0: 'N--.blEs8.blEuY...',
      p1: 'S--.bn-xM.blEuY...',
    },
    {
      reference: '3-2',
      p0: 'N--.blEs8.blEs8...',
      p1: 'S--.blExM.bn-s8...',
    },
    {
      reference: '4-2',
      p0: 'N--.blEs8.blEs8...',
      p1: 'S--.bn-xM.bn-s8...',
    },
    {
      reference: '3-1',
      p0: 'N--.blEs8.blEs8...',
      p1: 'S--.blExM.blEs8...',
    },
    {
      reference: '4-1',
      p0: 'N--.blEs8.blEs8...',
      p1: 'S--.bn-xM.blEs8...',
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
    const selection = { reference: transposeReference(reference), speedRatio: '1:1' } as const
    const pattern = buildVtgPattern(selection)

    expect(pattern?.props.map((prop) => ratioIndependentFrames(prop.anim))).toEqual(
      readable.props.map((prop) => ratioIndependentFrames(prop.anim.slice(0, 2))),
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
      mode: 'Standard',
      isAnti: false,
      p0: 'N--.bn-.bn-s8...',
      p1: 'S--.bn-xM.blEuY...',
    },
    {
      reference: '5-3',
      mode: 'Standard',
      isAnti: false,
      p0: 'N--.bn-.bn-s8...',
      p1: 'S--.bn-xM.bn-uY...',
    },
    {
      reference: '5-2',
      mode: 'Standard',
      isAnti: false,
      p0: 'N--.bn-.bn-...',
      p1: 'S--.bn-xM.blEs8...',
    },
    {
      reference: '5-1',
      mode: 'Standard',
      isAnti: false,
      p0: 'N--.bn-.bn-...',
      p1: 'S--.bn-xM.bn-s8...',
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
      const selection = {
        reference: transposeReference(reference),
        speedRatio: '1:1',
        isAnti,
      } as const
      const pattern = buildVtgPattern(selection)

      expect(pattern?.props.map((prop) => ratioIndependentFrames(prop.anim))).toEqual(
        readable.props.map((prop) => ratioIndependentFrames(prop.anim.slice(0, 2))),
      )
    },
  )

  it.each([
    {
      reference: '6-6',
      mode: 'Spin',
      isAnti: false,
      reverseQueryProps: true,
      p0: 'N--.blExM.blEuY...',
      p1: 'S--.bn-.bn-uY...',
    },
    {
      reference: '6-6',
      mode: 'Anti',
      isAnti: true,
      reverseQueryProps: true,
      p0: 'N--.blExM.blEs8...',
      p1: 'S--.bn-.bn-s8...',
    },
    {
      reference: '6-5',
      mode: 'Spin',
      isAnti: false,
      reverseQueryProps: true,
      p0: 'N--.blExM.bn-uY...',
      p1: 'S--.bn-.bn-uY...',
    },
    {
      reference: '6-5',
      mode: 'Anti',
      isAnti: true,
      reverseQueryProps: true,
      p0: 'N--.blExM.bn-s8...',
      p1: 'S--.bn-.bn-s8...',
    },
    {
      reference: '6-4',
      mode: 'Standard',
      isAnti: false,
      reverseQueryProps: true,
      p0: 'N--.blExM.blEuY...',
      p1: 'S--.bn-.bn-s8...',
    },
    {
      reference: '6-3',
      mode: 'Standard',
      isAnti: false,
      reverseQueryProps: false,
      p0: 'N--.bn-.bn-s8...',
      p1: 'S--.blExM.bn-uY...',
    },
    {
      reference: '6-2',
      mode: 'Standard',
      isAnti: false,
      reverseQueryProps: false,
      p0: 'N--.bn-.bn-uY...',
      p1: 'S--.blExM.blEs8...',
    },
    {
      reference: '6-1',
      mode: 'Standard',
      isAnti: false,
      reverseQueryProps: false,
      p0: 'N--.bn-.bn-uY...',
      p1: 'S--.blExM.bn-s8...',
    },
  ] as const)(
    'decodes the $mode replacement for $reference',
    async ({ reference, isAnti, reverseQueryProps, p0, p1 }) => {
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
      const selection = {
        reference: transposeReference(reference),
        speedRatio: '1:1',
        isAnti,
      } as const
      const pattern = buildVtgPattern(selection)
      const readableProps = reverseQueryProps ? [...readable.props].reverse() : readable.props

      expect(pattern?.props.map((prop) => ratioIndependentFrames(prop.anim))).toEqual(
        readableProps.map((prop) => ratioIndependentFrames(prop.anim.slice(0, 2))),
      )
    },
  )
})
