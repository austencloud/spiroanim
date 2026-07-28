import { describe, expect, it } from 'vitest'

import { createVtgAnimation, createVtgPreviewAnimation } from '@/features/vtg/createVtgAnimation'
import { buildVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { RootData } from '@/types/AnimTypes'

const createCurrentAnimation = () =>
  rootFinal({
    bpm: 90,
    prop: 0,
    color: 0,
    smooth: true,
    guides: true,
    paths: false,
    hands: true,
    visible: true,
    nodes: true,
    anchors: true,
    props: [{ anim: [{ arc: 45 }] }],
    aspectx: 16,
    aspecty: 9,
    distance: 30,
    thick: 8,
  } satisfies RootData)

describe('createVtgAnimation', () => {
  it('builds the first SO/TS cell from the edited readable template', () => {
    const current = createCurrentAnimation()
    const animation = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:1',
    })

    expect(animation).toMatchObject({
      bpm: vtgPlayerSettings.bpm,
      aspectx: vtgPlayerSettings.aspectx,
      aspecty: vtgPlayerSettings.aspecty,
      speed: vtgPlayerSettings.speed,
      props: [
        {
          color: 1,
          anim: [{ plane: 180, arc: 90 }, { plane: 180, arc: 90 }, {}, {}, {}],
        },
        {
          color: 6,
          anim: [{ plane: 180, arc: 90 }, { arc: 90, turns: -180 }, {}, {}, {}],
        },
      ],
    })
    expect(animation?.smooth).toBe(true)
  })

  it('returns fresh data without mutating the player state', () => {
    const current = createCurrentAnimation()
    const currentSnapshot = structuredClone(current)

    const first = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:1',
    })
    const second = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:1',
    })

    expect(first).not.toBe(second)
    expect(current).toEqual(currentSnapshot)
    expect(first?.props[0]?.anim).not.toBe(second?.props[0]?.anim)
    expect(first?.props.every((prop) => prop.anim.length === 5)).toBe(true)
    expect(first?.props[0]?.anim[2]).not.toBe(first?.props[0]?.anim[3])
  })

  it('adds default frames outside the row definition', () => {
    const selection = {
      reference: '1-6',
      speedRatio: '1:1',
    } as const

    expect(buildVtgPattern(selection)?.props[0]?.anim).toHaveLength(2)
    expect(createVtgAnimation(createCurrentAnimation(), selection)?.props[0]?.anim).toHaveLength(5)
  })

  it('uses player VTG settings with preview-only visibility and thickness overrides', () => {
    const preview = createVtgPreviewAnimation({
      reference: '1-6',
      speedRatio: '1:1',
    })
    if (preview === undefined) throw new Error('Expected the VTG preview pattern to be defined')

    expect(preview).toMatchObject({
      bpm: vtgPlayerSettings.bpm,
      paths: vtgPlayerSettings.paths,
      hands: vtgPlayerSettings.hands,
      distance: vtgPlayerSettings.distance,
      visible: false,
      thick: 15,
    })
    expect(preview.props.every((prop) => prop.anim.length === 5)).toBe(true)
    expect(
      preview.props.every(
        (prop) =>
          prop.paths === vtgPlayerSettings.paths &&
          prop.hands === false &&
          prop.visible === false &&
          prop.thick === 15,
      ),
    ).toBe(true)
    expect(
      rootCompile(preview).props.every(
        (prop) =>
          prop.hands === false &&
          prop.visible === false &&
          prop.thick === 15 &&
          prop.anim.length === 5,
      ),
    ).toBe(true)
  })

  it('sets scale 8 on VTG base frames and inherits it through compilation', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '1-6',
      speedRatio: '1:1',
    })
    if (animation === undefined) throw new Error('Expected the VTG pattern to be defined')

    expect(animation.props.map((prop) => prop.anim.map((frame) => frame.scale))).toEqual([
      [8, undefined, undefined, undefined, undefined],
      [8, undefined, undefined, undefined, undefined],
    ])
    expect(
      rootCompile(animation).props.every((prop) => prop.anim.every((frame) => frame.scale === 8)),
    ).toBe(true)
  })

  it('builds SS/TO from its replacement query values', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '2-6',
      speedRatio: '1:1',
    })

    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([
      { plane: 180, arc: 90, scale: 8 },
      { plane: 180, arc: 90 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { plane: 0, arc: 90, scale: 8 },
      { arc: 90, turns: -180 },
    ])
  })

  it('builds the fourth row 1 cell from its replacement query values', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '4-6',
      speedRatio: '1:1',
    })

    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([
      { plane: 180, arc: 90, turns: -180, scale: 8 },
      { plane: 180, arc: 90, turns: 0 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { arc: 90, turns: 180, scale: 8 },
      { arc: 90, turns: -180 },
    ])
  })

  it('swaps column 6 animation properties without changing root prop colors', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '6-6',
      speedRatio: '1:1',
      isAnti: false,
    })

    expect(animation?.props.map((prop) => prop.color)).toEqual([1, 6])
    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([
      { arc: 90, scale: 8 },
      { arc: 90, turns: 0 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { plane: 180, arc: 90, turns: 180, scale: 8 },
      { plane: 180, arc: 90, turns: 0 },
    ])
  })

  it('swaps selected animation tracks without changing root prop colors', () => {
    const current = createCurrentAnimation()
    const original = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:1',
    })
    const swapped = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:1',
      swapProps: true,
    })

    expect(swapped?.props.map((prop) => prop.color)).toEqual([1, 6])
    expect(swapped?.props[0]?.anim).toEqual(original?.props[1]?.anim)
    expect(swapped?.props[1]?.anim).toEqual(original?.props[0]?.anim)
  })

  it('reverses the effective Plane in both VTG base frames', () => {
    const original = buildVtgPattern({
      reference: '2-6',
      speedRatio: '1:1',
    })
    const reversed = buildVtgPattern({
      reference: '2-6',
      speedRatio: '1:1',
      reversePlane: true,
    })

    expect(original?.props.map((prop) => prop.anim[0]?.plane)).toEqual([180, 0])
    expect(reversed?.props.map((prop) => prop.anim[0]?.plane)).toEqual([0, 180])
    expect(reversed?.props.map((prop) => prop.anim[1])).toEqual(
      original?.props.map((prop) => prop.anim[1]),
    )

    const reversedImplicitPlanes = buildVtgPattern({
      reference: '5-2',
      speedRatio: '1:1',
      reversePlane: true,
    })
    expect(reversedImplicitPlanes?.props.map((prop) => prop.anim[0]?.plane)).toEqual([180, 180])
  })

  it('caps BPM and Scale while mapping Scale to Distance', () => {
    expect(vtgPlayerSettings.distance).toBe(17.5)

    const minimum = buildVtgPattern({
      reference: '1-6',
      speedRatio: '1:1',
      bpm: 20,
      scale: 0.2,
    })
    const maximum = buildVtgPattern({
      reference: '1-6',
      speedRatio: '1:1',
      bpm: 200,
      scale: 2,
    })
    const pivot = buildVtgPattern({
      reference: '1-6',
      speedRatio: '1:1',
      scale: 0.6,
    })

    expect(minimum).toMatchObject({ bpm: 40, distance: 14 })
    expect(minimum?.props.map((prop) => prop.anim[0]?.scale)).toEqual([5, 5])
    expect(pivot).toMatchObject({ distance: 15 })
    expect(maximum).toMatchObject({ bpm: 140, distance: 25 })
    expect(maximum?.props.map((prop) => prop.anim[0]?.scale)).toEqual([14, 14])
  })

  it('builds an inferred 1:5 pattern', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '5-2',
      speedRatio: '1:5',
    })

    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([
      { arc: 90, scale: 8 },
      { arc: 90, turns: 360 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { arc: 90, turns: 180, scale: 8 },
      { plane: 180, arc: 90, turns: -540 },
    ])
  })

  it('uses the explicit 1:3 Anti values for a special cell', () => {
    const animation = createVtgAnimation(createCurrentAnimation(), {
      reference: '5-5',
      speedRatio: '1:3',
      isAnti: true,
    })

    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([
      { arc: 90, scale: 8 },
      { plane: 180, arc: 90, turns: -360 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { arc: 90, turns: 180, scale: 8 },
      { plane: 180, arc: 90, turns: -360 },
    ])
  })
})
