import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
} from '@/features/builder/appendVtgBuilderPattern'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  createVtgTransitionPreviewAnimations,
  getVtgTransitionPreviewBeatCount,
  removeVtgTransitionPatternPreview,
} from '@/features/vtg/math/createVtgTransitionQuickSlotAnimations'
import { rootCompile } from '@/math/animation/AnimFunc'
import { findExplicitPlaneOrTurnsFrameIndices } from '@/math/animation/findExplicitPlaneOrTurnsFrameIndices'
import { findVtgPatternMatch } from '@/features/vtg/matchVtgAnimation'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'

describe('appendVtgBuilderPattern', () => {
  it('creates the initial Builder pattern when dropping onto an empty animation', () => {
    const template = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!template) throw new Error('Expected a supported VTG pattern')
    const empty = { ...template, props: [] }

    const result = appendVtgBuilderPattern(empty, {
      reference: '5-2',
      speedRatio: '1:3',
    })

    expect(result?.props).toHaveLength(2)
    expect(createVtgTransitionPreviewAnimations(result!)).toHaveLength(1)
  })

  it('appends a four-beat piece with its source travel direction', () => {
    const current = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    const source = createDefaultVtgAnimation({ reference: '5-6', speedRatio: '1:3' })
    if (!current || !source) throw new Error('Expected supported VTG patterns')

    const result = appendVtgBuilderPattern(current, {
      reference: '5-6',
      speedRatio: '1:3',
    })
    if (!result) throw new Error('Expected an appended VTG pattern')

    expect(result.props.map((prop) => prop.anim.length)).toEqual(
      current.props.map((prop) => prop.anim.length + 8),
    )
    const appendStart = current.props[0]!.anim.length
    const compiledSource = rootCompile(source)
    result.props.forEach((prop, index) => {
      const expectedPlane = Math.abs(compiledSource.props[index]!.anim[0]!.plane) === 180 ? 180 : 0
      expect(prop.anim[appendStart]?.plane).toBe(expectedPlane)
      expect(prop.anim.at(-1)).toEqual({})
    })
    const previews = createVtgTransitionPreviewAnimations(result)
    expect(previews).toHaveLength(2)
    expect(previews?.map((preview) => preview.props[0]!.anim.length)).toEqual([9, 9])
  })

  it('preserves the VTG 180 transform after removing the source first frame', () => {
    const current = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!current) throw new Error('Expected a supported VTG pattern')

    const base = appendVtgBuilderPattern(current, {
      reference: '5-2',
      speedRatio: '1:3',
    })
    const reversed = appendVtgBuilderPattern(current, {
      reference: '5-2',
      speedRatio: '1:3',
      reversePlane: true,
    })
    if (!base || !reversed) throw new Error('Expected appended VTG patterns')

    const appendStart = current.props[0]!.anim.length
    expect(reversed.props.map((prop) => prop.anim[appendStart]?.plane)).not.toEqual(
      base.props.map((prop) => prop.anim[appendStart]?.plane),
    )
  })

  it('keeps a shifted source cell as one four-beat thumbnail', () => {
    const current = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!current) throw new Error('Expected a supported VTG pattern')

    const result = appendVtgBuilderPattern(current, {
      reference: '5-2',
      speedRatio: '1:3',
      beat: 4.5,
    })
    if (!result) throw new Error('Expected an appended VTG pattern')

    const previews = createVtgTransitionPreviewAnimations(result)
    expect(previews).toHaveLength(2)
    expect(previews?.map((preview) => preview.props[0]!.anim.length)).toEqual([9, 9])
    const appendStart = current.props[0]!.anim.length
    const source = createDefaultVtgAnimation({
      reference: '5-2',
      speedRatio: '1:3',
      beat: 4.5,
    })
    if (!source) throw new Error('Expected a shifted VTG source')
    const compiledSource = rootCompile(source)
    expect(result.props.map((prop) => prop.anim[appendStart]?.turns)).toEqual(
      compiledSource.props.map((prop) => prop.anim[1]!.turns),
    )
  })

  it.each([0, 2])(
    'inserts before preview %s while preserving the following authored pattern frames',
    (targetIndex) => {
      const current = createDefaultVtgAnimation({
        reference: '5-1',
        speedRatio: '1:3',
        transition: true,
        transitionBeats: 3,
        transitionQuad: true,
      })
      if (!current) throw new Error('Expected a supported VTG transition')
      const before = createVtgTransitionPreviewAnimations(current)
      if (!before) throw new Error('Expected VTG transition previews')
      const beforeCounts = before.map(getVtgTransitionPreviewBeatCount)
      const starts = [
        0,
        ...findExplicitPlaneOrTurnsFrameIndices(current, 2).map((frameIndex) => frameIndex - 1),
      ]
      const insertionIndex = starts[targetIndex]! + 1

      const result = insertVtgBuilderPattern(
        current,
        { reference: '5-2', speedRatio: '1:3' },
        targetIndex,
      )
      if (!result) throw new Error('Expected an inserted VTG pattern')
      const after = createVtgTransitionPreviewAnimations(result)
      if (!after) throw new Error('Expected inserted VTG previews')

      expect(after.map(getVtgTransitionPreviewBeatCount)).toEqual([
        ...beforeCounts.slice(0, targetIndex),
        4,
        ...beforeCounts.slice(targetIndex),
      ])
      const compiledBefore = rootCompile(current)
      const compiledAfter = rootCompile(result)
      result.props.forEach((prop, propIndex) => {
        expect(prop.anim.slice(insertionIndex + 9)).toEqual(
          current.props[propIndex]!.anim.slice(insertionIndex + 1),
        )
        const beforeRelationship = compiledBefore.props[propIndex]!.anim[insertionIndex]!
        const afterRelationship = compiledAfter.props[propIndex]!.anim[insertionIndex + 8]!
        expect({ arc: afterRelationship.arc, turns: afterRelationship.turns }).toEqual({
          arc: beforeRelationship.arc,
          turns: beforeRelationship.turns,
        })
      })
    },
  )

  it.each([false, true])(
    'preserves %s Anti when inserting a Spin/Anti pattern before the first thumbnail',
    (isAnti) => {
      const current = createDefaultVtgAnimation({
        reference: '5-1',
        speedRatio: '1:3',
        transition: true,
      })
      if (!current) throw new Error('Expected a supported VTG transition')

      const result = insertVtgBuilderPattern(
        current,
        { reference: '5-5', speedRatio: '1:3', isAnti },
        0,
      )
      if (!result) throw new Error('Expected an inserted VTG pattern')
      const inserted = createVtgTransitionPreviewAnimations(result)?.[0]
      if (!inserted) throw new Error('Expected an inserted first preview')

      expect(findVtgPatternMatch(inserted)).toMatchObject({ reference: '5-5', isAnti })
    },
  )

  it('deletes a middle piece while preserving the following pattern relationship', () => {
    const first = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!first) throw new Error('Expected a supported VTG pattern')
    const second = appendVtgBuilderPattern(first, { reference: '5-2', speedRatio: '1:3' })
    const third = second
      ? appendVtgBuilderPattern(second, {
          reference: '5-5',
          speedRatio: '1:3',
          isAnti: true,
        })
      : undefined
    if (!third) throw new Error('Expected three Builder patterns')
    const before = createVtgTransitionPreviewAnimations(third)

    const result = removeVtgTransitionPatternPreview(third, 1)
    const after = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(after).toHaveLength(2)
    const beforeMatch = findVtgPatternMatch(before![2]!)
    expect(findVtgPatternMatch(after![1]!)).toMatchObject({
      reference: beforeMatch?.reference,
      reversePlane: beforeMatch?.reversePlane,
      isAnti: beforeMatch?.isAnti,
    })
  })

  it('preserves the following Anti/In shape against the supplied independently phased props', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const source = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew08Yn11Y&p0=Q__.myQ_____q.5JEsR....._ZEvF............_ZEsR......&m0=_1_mxqv__&p1=N__.05E_____q.5L_sR..........._ZEvF............_ZEsR&c=_f_bhq&v=6',
        ),
      ),
    )

    const result = removeVtgTransitionPatternPreview(source, 2)

    expect(result && codec.encodeQS(result, false)).toEqual(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew08Yn11Y&p0=Q__.myQ_____q.5JEsR....._ZEvF......___sR......&m0=_1_mxqv__&p1=N__.05E_____q.5L_sR...........5L_vF......_ZEsR&c=_f_bhq&v=6',
        ),
      ),
    )
  })

  it('preserves the following Anti/In shape when its prop tracks need exchanging', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const source = codec.decodeQS(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew08Yn11Y&p0=Q__.myQ_____q.5JEsR....._ZEvF............_ZEsR......&m0=_1_mxqv__&p1=N__.05E_____q.5L_sR..........._ZEvF............_ZEsR&c=_f_bhq&v=6',
        ),
      ),
    )

    const result = removeVtgTransitionPatternPreview(source, 1)

    expect(result && codec.encodeQS(result, false)).toEqual(
      Object.fromEntries(
        new URLSearchParams(
          'r=Ew08Yn11Y&p0=Q__.myQ_____q.5JEsR.....5E0vF......_ZEsR......&m0=_1_mxqv__&p1=N__.05E_____q.5L_sR.....5L_vF............_ZEsR&c=_f_bhq&v=6',
        ),
      ),
    )
  })

  it('rebases the next piece when deleting the first Builder pattern', () => {
    const first = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!first) throw new Error('Expected a supported VTG pattern')
    const second = appendVtgBuilderPattern(first, { reference: '5-2', speedRatio: '1:3' })
    if (!second) throw new Error('Expected two Builder patterns')
    const before = createVtgTransitionPreviewAnimations(second)

    const result = removeVtgTransitionPatternPreview(second, 0)
    const remaining = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(remaining).toHaveLength(1)
    expect(findVtgPatternMatch(remaining![0]!)).toEqual(findVtgPatternMatch(before![1]!))
  })

  it('returns to the empty Builder state when deleting its only pattern', () => {
    const only = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!only) throw new Error('Expected a supported VTG pattern')

    expect(removeVtgTransitionPatternPreview(only, 0)?.props).toEqual([])
  })
})
