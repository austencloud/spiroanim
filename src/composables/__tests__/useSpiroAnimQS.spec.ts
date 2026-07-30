import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import { useBaseQS } from '@/services/query/createBaseQS'
import { VDEF } from '@/services/query/versions/SpiroAnimQSv1'
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
    expect(query.encodeQS(query.decodeQS(encoded), false)).toEqual(encoded)
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
