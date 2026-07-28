import { describe, expect, it } from 'vitest'

import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
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
