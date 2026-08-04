import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'
import { VDEF as VDEF_V2 } from '@/services/query/versions/SpiroAnimQSv2'
import { CHARSET as CHARSET_V3, VDEF as VDEF_V3 } from '@/services/query/versions/SpiroAnimQSv3'
import type { RootDataFinal } from '@/types/AnimTypes'

const createRoot = (): RootDataFinal => ({
  speed: 1,
  type: 0,
  turns: 0,
  depth: 0,
  smooth: true,
  bpm: 60,
  color: 1,
  prop: 1,
  guides: false,
  anchors: false,
  nodes: true,
  paths: true,
  hands: true,
  arms: false,
  visible: true,
  aspectx: 16,
  aspecty: 9,
  distance: 22,
  thick: 4,
  props: [
    {
      color: 2,
      anim: [{ arc: 90, plane: 0, turns: -540, move: [2, 0, 0] }],
    },
  ],
})

describe('useSpiroAnimQS', () => {
  it('preserves the version-1 query representation', async () => {
    const query = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const root = createRoot()

    const encoded = query.encodeQS(root, false)

    expect(encoded).toEqual({
      r: 'GE28EPi9g',
      p0: 'O--.biQmw-------wuu',
      v: '1',
    })
    const decoded = query.decodeQS(encoded)
    expect(decoded.arms).toBe(false)
    expect(query.encodeQS(decoded, false)).toEqual(encoded)
  })

  it('round-trips inherited Arms values in version 2', async () => {
    const query = await useSpiroAnimQS(VDEF_V2, useBaseQS(VDEF_V2), 2)
    const root = createRoot()
    root.arms = true
    root.props[0]!.arms = false

    const encoded = query.encodeQS(root, false)
    const decoded = query.decodeQS(encoded)

    expect(encoded).toEqual({
      r: 'GE28Eji9g',
      p0: 'O--f.biQmw-------wuu',
      v: '2',
    })
    expect(decoded.arms).toBe(true)
    expect(decoded.props[0]!.arms).toBe(false)
  })

  it('uses underscore padding in version 3 while retaining version 2 compatibility', async () => {
    const query = await useSpiroAnimQS(VDEF_V3, useBaseQS(VDEF_V3, { charset: CHARSET_V3 }), 3)
    const root = createRoot()
    root.arms = true
    root.props[0]!.arms = false

    const encoded = query.encodeQS(root, false)

    expect(encoded).toEqual({
      r: 'GE28Eji9g',
      p0: 'O__f.biQmw_______wuu',
      v: '3',
    })
    expect(query.decodeQS(encoded)).toEqual(
      expect.objectContaining({
        arms: true,
        props: [expect.objectContaining({ arms: false })],
      }),
    )

    const decodedV2 = await query.decodeVer({
      r: 'GE28Eji9g',
      p0: 'O--f.biQmw-------wuu',
      v: '2',
    })
    expect(decodedV2.arms).toBe(true)
    expect(decodedV2.props[0]!.arms).toBe(false)
  })

  it('falls back to the current decoder for unavailable versions', async () => {
    const query = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)

    const decoded = await query.decodeVer({ r: 'GE28EPi9g', v: '999' })

    expect(decoded).toMatchObject({ bpm: 60, speed: 1, type: 0 })
  })

  it('groups rapid interaction updates into one undo history entry', async () => {
    const query = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const original = createRoot()
    const firstUpdate = structuredClone(original)
    const finalUpdate = structuredClone(original)
    firstUpdate.props[0]!.anim[0]!.arc = 100
    finalUpdate.props[0]!.anim[0]!.arc = 120

    query.beginHistoryGroup(original)
    query.encodeQS(firstUpdate)
    query.encodeQS(finalUpdate)
    query.endHistoryGroup()

    expect(query.qsHistory.value).toEqual([
      new URLSearchParams(query.encodeQS(original, false)).toString(),
      new URLSearchParams(query.encodeQS(finalUpdate, false)).toString(),
    ])

    const separateUpdate = structuredClone(finalUpdate)
    separateUpdate.props[0]!.anim[0]!.arc = 130
    query.encodeQS(separateUpdate)
    expect(query.qsHistory.value).toHaveLength(3)
  })

  it('undoes, redoes, and clears redo history after a new edit', async () => {
    const query = await useSpiroAnimQS(VDEF, useBaseQS(VDEF), 1)
    const original = createRoot()
    const changed = structuredClone(original)
    changed.bpm = 90

    query.encodeQS(original)
    query.encodeQS(changed)

    expect(query.undoQS()?.bpm).toBe(60)
    expect(query.qsFuture.value).toHaveLength(1)
    expect(query.redoQS()?.bpm).toBe(90)
    expect(query.qsFuture.value).toHaveLength(0)

    const undone = query.undoQS()
    expect(undone?.bpm).toBe(60)
    query.encodeQS(undone!)

    const replacement = structuredClone(original)
    replacement.bpm = 120
    query.encodeQS(replacement)

    expect(query.qsFuture.value).toHaveLength(0)
    expect(query.redoQS()).toBeUndefined()
  })
})
