import { describe, expect, it } from 'vitest'

import { useSpiroAnimQS } from '@/composables/useSpiroAnimQS'
import {
  appendVtgBuilderPattern,
  insertVtgBuilderPattern,
  replaceFirstVtgBuilderPattern,
  swapVtgBuilderPatternProps,
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
import {
  areVtgBuilderSpinsEqual,
  getVtgBuilderMotion,
} from '@/features/builder/describeVtgBuilderMotion'
import { useBaseQS } from '@/services/query/createBaseQS'
import { loadSpiroAnimQSVersion } from '@/services/query/versions'
import type { RootDataFinal } from '@/types/AnimTypes'
import { applyPatternFinalTransforms } from '@/features/concepts/applyPatternFinalTransforms'

const expectSameSpinsAndDuration = (actual: RootDataFinal, expected: RootDataFinal) => {
  expect(areVtgBuilderSpinsEqual(getVtgBuilderMotion(actual), getVtgBuilderMotion(expected))).toBe(
    true,
  )
  expect(getVtgTransitionPreviewBeatCount(actual)).toBe(getVtgTransitionPreviewBeatCount(expected))
}

describe('appendVtgBuilderPattern', () => {
  it.each([0, 1, 2])(
    'swaps props in portion %s while preserving that portion and its successor',
    (targetIndex) => {
      const selections = [
        { reference: '5-1', speedRatio: '1:3' },
        { reference: '5-1', speedRatio: '1:3' },
        { reference: '5-1', speedRatio: '1:3' },
      ] as const
      const build = () => {
        const first = createDefaultVtgAnimation(selections[0])
        const second = first ? appendVtgBuilderPattern(first, selections[1]) : undefined
        return second ? appendVtgBuilderPattern(second, selections[2]) : undefined
      }

      const source = build()
      const serializedSource = JSON.stringify(source)
      const updated = source ? swapVtgBuilderPatternProps(source, targetIndex) : undefined
      const twice = updated ? swapVtgBuilderPatternProps(updated, targetIndex) : undefined
      if (!source || !updated || !twice) {
        throw new Error(`Expected Builder portion ${targetIndex} to swap twice`)
      }

      const beforePreviews = createVtgTransitionPreviewAnimations(source)
      const updatedPreviews = createVtgTransitionPreviewAnimations(updated)
      const twicePreviews = createVtgTransitionPreviewAnimations(twice)
      expect(updatedPreviews).toHaveLength(3)
      expect(twicePreviews).toHaveLength(3)
      expect(JSON.stringify(source)).toBe(serializedSource)

      for (const previewIndex of [0, 1, 2]) {
        const beforeMotion = getVtgBuilderMotion(beforePreviews![previewIndex]!)
        const expectedMotion =
          previewIndex === targetIndex
            ? getVtgBuilderMotion(
                applyPatternFinalTransforms(beforePreviews![previewIndex]!, { swapProps: true }),
              )
            : beforeMotion
        expect(
          getVtgBuilderMotion(updatedPreviews![previewIndex]!),
          `target ${targetIndex}, preview ${previewIndex}`,
        ).toEqual(expectedMotion)
        expect(getVtgTransitionPreviewBeatCount(updatedPreviews![previewIndex]!)).toBe(
          getVtgTransitionPreviewBeatCount(beforePreviews![previewIndex]!),
        )
        expect(getVtgBuilderMotion(twicePreviews![previewIndex]!)).toEqual(
          getVtgBuilderMotion(beforePreviews![previewIndex]!),
        )
        expect(getVtgTransitionPreviewBeatCount(twicePreviews![previewIndex]!)).toBe(
          getVtgTransitionPreviewBeatCount(beforePreviews![previewIndex]!),
        )
      }
    },
  )

  it('preserves each prop Anti/In spin when appending an independently authored pattern', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const decode = (query: string) => codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
    const current = decode(
      'r=Ew09Ak11Y&p0=Q__.biQs8___s.5JEwm.......&m0=_1_mxqv__&p1=N__.biQxM___s.5L_s8.......&c=_i_bhq&v=6',
    )
    const cell = decode(
      'r=Ew09Ak11Y&p0=Q__.biQ_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.biQ_____s.5JEs8.......&c=_i_bhq&v=6',
    )
    const selection = findVtgPatternMatch(cell)
    if (!selection) throw new Error('Expected exact 1:3 cell 1-1 match')
    const result = appendVtgBuilderPattern(current, selection)
    if (!result) throw new Error('Expected appended exact pattern')
    const compiledCell = rootCompile(cell)
    const compiledResult = rootCompile(result)
    const appendStart = current.props[0]!.anim.length
    const appendedPreview = createVtgTransitionPreviewAnimations(result)?.[1]
    if (!appendedPreview) throw new Error('Expected appended preview')
    expectSameSpinsAndDuration(appendedPreview, cell)
    expect(compiledResult.props.map((prop) => prop.anim[appendStart]?.turns)).toEqual(
      compiledCell.props.map((prop) => prop.anim[1]?.turns),
    )
    expect(compiledResult.props.map((prop) => prop.anim[appendStart]?.arc)).toEqual(
      compiledCell.props.map((prop) => prop.anim[1]?.arc),
    )
  })

  it.each([
    {
      name: 'opposite-direction source',
      query:
        'r=Ew09Ak11Y&p0=Q__.biQ_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.blE_____s.5JEs8.......&c=_i_bhq&v=6',
    },
    {
      name: 'same-direction source',
      query:
        'r=Ew09Ak11Y&p0=Q__.biQ_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.biQ_____s.5JEs8.......&c=_i_bhq&v=6',
    },
  ])('preserves both prop spins from a dragged $name', async ({ query }) => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const decode = (value: string) => codec.decodeQS(Object.fromEntries(new URLSearchParams(value)))
    const current = decode(
      'r=Ew09Ak11Y&p0=Q__.biQs8___s.5JEwm.......&m0=_1_mxqv__&p1=N__.biQxM___s.5L_s8.......&c=_i_bhq&v=6',
    )
    const source = decode(query)
    const selection = findVtgPatternMatch(source)
    if (!selection) throw new Error('Expected the dragged source to match a VTG pattern')
    const result = appendVtgBuilderPattern(current, selection)
    if (!result) throw new Error('Expected cell 1-1 to append')

    const appendedPreview = createVtgTransitionPreviewAnimations(result)?.[1]
    if (!appendedPreview) throw new Error('Expected appended preview')
    expectSameSpinsAndDuration(appendedPreview, source)
  })
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
    result.props.forEach((prop) => expect(prop.anim.at(-1)).toEqual({}))
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
        expect({
          arc: afterRelationship.arc,
          turns: afterRelationship.turns,
        }).toEqual({
          arc: beforeRelationship.arc,
          turns: beforeRelationship.turns,
        })
        expect(prop.anim[insertionIndex + 8]?.axis).toBe(
          current.props[propIndex]!.anim[insertionIndex]?.axis,
        )
      })
      expectSameSpinsAndDuration(after[targetIndex + 1]!, before[targetIndex]!)
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

  it('deletes a middle piece while preserving the following Anti/In spins', () => {
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
    expectSameSpinsAndDuration(after![1]!, before![2]!)
    const beforeStarts = [
      0,
      ...findExplicitPlaneOrTurnsFrameIndices(third, 2).map((frameIndex) => frameIndex - 1),
    ]
    const afterStarts = [
      0,
      ...findExplicitPlaneOrTurnsFrameIndices(result!, 2).map((frameIndex) => frameIndex - 1),
    ]
    third.props.forEach((prop, propIndex) => {
      const sourceTarget = beforeStarts[2]! + 1
      const resultTarget = afterStarts[1]! + 1
      expect(result!.props[propIndex]!.anim[resultTarget]?.axis).toBe(prop.anim[sourceTarget]?.axis)
      expect(result!.props[propIndex]!.anim.slice(resultTarget + 1)).toEqual(
        prop.anim.slice(sourceTarget + 1),
      )
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

    const before = createVtgTransitionPreviewAnimations(source)
    const result = removeVtgTransitionPatternPreview(source, 2)
    const after = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(after).toHaveLength(before!.length - 1)
    expectSameSpinsAndDuration(after![2]!, before![3]!)
  })

  it('preserves the following Anti/In spins without exchanging prop tracks', async () => {
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
    const before = createVtgTransitionPreviewAnimations(source)?.[2]
    const after = result ? createVtgTransitionPreviewAnimations(result)?.[1] : undefined
    if (!before || !after) throw new Error('Expected the following preview before and after delete')
    expectSameSpinsAndDuration(after, before)
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
    expectSameSpinsAndDuration(remaining![0]!, before![1]!)
  })

  it('returns to the empty Builder state when deleting its only pattern', () => {
    const only = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!only) throw new Error('Expected a supported VTG pattern')

    expect(removeVtgTransitionPatternPreview(only, 0)?.props).toEqual([])
  })

  it('replaces the first Builder pattern while preserving the following pieces', () => {
    const first = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!first) throw new Error('Expected a supported VTG pattern')
    const second = appendVtgBuilderPattern(first, {
      reference: '5-5',
      speedRatio: '1:3',
      isAnti: true,
    })
    const source = second
      ? appendVtgBuilderPattern(second, { reference: '5-2', speedRatio: '1:3' })
      : undefined
    if (!source) throw new Error('Expected three Builder patterns')
    const followingBefore = createVtgTransitionPreviewAnimations(source)?.slice(1)

    const result = replaceFirstVtgBuilderPattern(source, {
      reference: '3-4',
      speedRatio: '1:3',
      beat: 2,
    })
    const previews = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(previews).toHaveLength(3)
    expect(findVtgPatternMatch(previews![0]!)).toMatchObject({
      reference: '3-4',
      speedRatio: '1:3',
      beat: 2,
    })
    expect(
      areVtgBuilderSpinsEqual(
        getVtgBuilderMotion(previews![1]!),
        getVtgBuilderMotion(followingBefore![0]!),
      ),
    ).toBe(true)
    const sourceStarts = [
      0,
      ...findExplicitPlaneOrTurnsFrameIndices(source, 2).map((frameIndex) => frameIndex - 1),
    ]
    const laterStart = sourceStarts[2]!
    result!.props.forEach((prop, propIndex) => {
      const expectedTail = source.props[propIndex]!.anim.slice(laterStart + 1)
      expect(prop.anim.slice(-expectedTail.length)).toEqual(expectedTail)
    })
  })

  it('preserves an In-spin green prop when replacing this first Anti-spin portion', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const decode = (query: string) => codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
    const source = decode(
      'r=Ew08Yk11Y&p0=Q__.bn______q.5GQvF........5L_s8.......&m0=_1_mxqv__&p1=N__.blExM___q.5GQsR........5JEwm.......&c=_i_bhq&v=6',
    )
    const dropped = decode(
      'r=Ew08Yk11Y&p0=Q__.blE_____s.5JEs8.......&m0=_1_mxqv__&p1=N__.blE_____s.5L_s8.......&c=_i_bhq&v=6',
    )
    const selection = findVtgPatternMatch(dropped)
    const before = createVtgTransitionPreviewAnimations(source)
    if (!selection || !before?.[1]) throw new Error('Expected supported Builder regression data')

    const result = replaceFirstVtgBuilderPattern(source, selection)
    const after = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(after).toHaveLength(2)
    expect(
      areVtgBuilderSpinsEqual(getVtgBuilderMotion(after![1]!), getVtgBuilderMotion(before[1])),
    ).toBe(true)
  })

  it('preserves the following portion for a second independently phased replacement', async () => {
    const version = await loadSpiroAnimQSVersion(6)
    const codec = await useSpiroAnimQS(
      version.VDEF,
      useBaseQS(version.VDEF, { charset: version.CHARSET }),
      6,
    )
    const decode = (query: string) => codec.decodeQS(Object.fromEntries(new URLSearchParams(query)))
    const source = decode(
      'r=Ew08Yk11Y&p0=Q__.mBEs8___q.5JEsR........5E0s8.......&m0=_1_mxqv__&p1=N__.07_xM___q.5JEsR........5GQvF.......&c=_i_bhq&v=6',
    )
    const dropped = decode(
      'r=Ew08Yk11Y&p0=Q__.07______q.5L_vF.......&m0=_1_mxqv__&p1=N__.mBExM___q.5JEvF.......&c=_f_bhq&v=6',
    )
    const selection = findVtgPatternMatch(dropped)
    const before = createVtgTransitionPreviewAnimations(source)
    if (!selection || !before?.[1]) throw new Error('Expected supported Builder regression data')

    const result = replaceFirstVtgBuilderPattern(source, selection)
    const after = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(after).toHaveLength(2)
    expect(findVtgPatternMatch(before[1])).toBeUndefined()
    expect(
      areVtgBuilderSpinsEqual(getVtgBuilderMotion(after![1]!), getVtgBuilderMotion(before[1])),
    ).toBe(true)
    expect(after![1]!.props.map((prop) => prop.anim[1]?.axis)).toEqual([undefined, undefined])
    expect(getVtgTransitionPreviewBeatCount(after![1]!)).toBe(
      getVtgTransitionPreviewBeatCount(before[1]),
    )
  })

  it('rebuilds the Builder when replacing its only pattern', () => {
    const source = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!source) throw new Error('Expected a supported VTG pattern')

    const result = replaceFirstVtgBuilderPattern(source, {
      reference: '5-2',
      speedRatio: '1:3',
    })
    const previews = result ? createVtgTransitionPreviewAnimations(result) : undefined

    expect(previews).toHaveLength(1)
    expect(findVtgPatternMatch(previews![0]!)).toMatchObject({
      reference: '5-2',
      speedRatio: '1:3',
    })
  })
})
