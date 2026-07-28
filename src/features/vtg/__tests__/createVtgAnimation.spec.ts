import { describe, expect, it } from 'vitest'

import { createVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { getVtgPatternDefinition } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
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
          anim: [{ arc: 180, scale: 10 }, { arc: 90 }, {}, {}, {}],
        },
        {
          color: 6,
          anim: [
            { plane: 180, arc: 0, turns: 180, scale: 10 },
            { arc: 90, turns: -180 },
            {},
            {},
            {},
          ],
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
      speedRatio: '1:3',
    })
    const second = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:3',
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
    const definition = getVtgPatternDefinition(selection)

    expect(definition?.build(selection.speedRatio).props[0]?.anim).toHaveLength(2)
    expect(createVtgAnimation(createCurrentAnimation(), selection)?.props[0]?.anim).toHaveLength(5)
  })

  it('does not replace the player for a catalog cell that is not defined yet', () => {
    expect(
      createVtgAnimation(createCurrentAnimation(), {
        reference: '2-6',
        speedRatio: '1:5',
      }),
    ).toBeUndefined()
  })
})
