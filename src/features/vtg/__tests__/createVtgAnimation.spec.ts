import { describe, expect, it } from 'vitest'

import {
  createDefaultVtgAnimation,
  createVtgAnimation as createVtgAnimationForSelection,
  createVtgPreviewAnimation as createVtgPreviewAnimationForSelection,
} from '@/features/vtg/createVtgAnimation'
import { buildVtgPattern as buildSelectedVtgPattern } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgFixedShapeCells } from '@/features/vtg/data/vtgPatternCatalog'
import { vtgPlayerSettings } from '@/features/vtg/data/vtgPlayerSettings'
import { supportsVtgQtrTransition, vtgBeats, vtgSpeedRatios } from '@/features/vtg/types'
import type { VtgCellReference, VtgPatternSelection, VtgRuleNumber } from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import { reverseAngle } from '@/math/animation/AngleFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { doublePlaybackMultiplier } from '@/math/animation/subdivideAnimationPlayback'
import type { RootData, RootDataFinal } from '@/types/AnimTypes'
import { patternShapes } from '@/types/PatternTypes'

const transposeSelection = <Selection extends VtgPatternSelection>(
  selection: Selection,
): Selection => {
  const [column, row] = selection.reference.split('-')
  return { ...selection, reference: `${row}-${column}` as VtgCellReference }
}

const createVtgAnimation = (current: RootDataFinal, selection: VtgPatternSelection) =>
  createVtgAnimationForSelection(current, transposeSelection(selection))

const createVtgPreviewAnimation = (selection: VtgPatternSelection) =>
  createVtgPreviewAnimationForSelection(transposeSelection(selection))

const buildVtgPattern = (selection: VtgPatternSelection) =>
  buildSelectedVtgPattern(transposeSelection(selection))

const createCurrentAnimation = () =>
  rootFinal({
    bpm: 90,
    prop: 0,
    color: 0,
    smooth: true,
    guides: true,
    paths: false,
    hands: true,
    arms: false,
    visible: true,
    nodes: true,
    anchors: true,
    props: [{ anim: [{ arc: 45 }] }],
    aspectx: 16,
    aspecty: 9,
    distance: 30,
    thick: 8,
  } satisfies RootData)

const expectVectorClose = (actual: readonly number[], expected: readonly number[]) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 9))
}

describe('createVtgAnimation', () => {
  it('keeps every removable transition-subdivision continuation frame empty', () => {
    const ruleNumbers = [1, 2, 3, 4, 5, 6] as const satisfies readonly VtgRuleNumber[]
    const booleanOptions = [false, true] as const
    const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])

    for (const column of ruleNumbers) {
      for (const row of ruleNumbers) {
        const reference = `${column}-${row}` as VtgCellReference
        const antiOptions = spinToggleCells.has(reference) ? booleanOptions : ([false] as const)
        for (const speedRatio of vtgSpeedRatios.filter((ratio) =>
          supportsVtgQtrTransition(ratio),
        )) {
          for (const isAnti of antiOptions) {
            for (const shape of patternShapes) {
              for (const beat of vtgBeats) {
                for (const swapProps of booleanOptions) {
                  for (const reversePlane of booleanOptions) {
                    const animation = createDefaultVtgAnimation({
                      reference,
                      speedRatio,
                      isAnti,
                      shape,
                      beat,
                      swapProps,
                      reversePlane,
                      transition: true,
                    })
                    if (!animation) continue

                    for (const prop of animation.props) {
                      expect(prop.anim[4]).toEqual({})
                      expect(prop.anim[6]).toEqual({})
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  it.each(vtgBeats)('uses Shift to start the closed cycle on beat %s', (beat) => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      swapProps: true,
      reversePlane: true,
      shape: 'box',
    } as const satisfies VtgPatternSelection
    const originalAnimation = createVtgAnimationForSelection(createCurrentAnimation(), selection)
    const shiftedAnimation = createVtgAnimationForSelection(createCurrentAnimation(), {
      ...selection,
      beat,
    })
    if (!originalAnimation || !shiftedAnimation) throw new Error('Expected both VTG animations')

    const original = rootCompile(originalAnimation)
    const shifted = rootCompile(shiftedAnimation)

    expect(shifted.props).toHaveLength(original.props.length)

    for (const [propIndex, shiftedProp] of shifted.props.entries()) {
      const originalFrames = original.props[propIndex]!.anim
      const cycleLength = originalFrames.length - 1

      for (const [frameIndex, shiftedFrame] of shiftedProp.anim.entries()) {
        const originalIndex = (beat - 1 + (frameIndex % cycleLength)) % cycleLength
        const expectedFrame = originalFrames[originalIndex]!

        expectVectorClose(shiftedFrame.pos, expectedFrame.pos)
        expectVectorClose(shiftedFrame.rot, expectedFrame.rot)
      }
    }
  })

  it('subdivides the base playback internally when applying the transition', () => {
    const selection = {
      reference: '5-1',
      speedRatio: '1:3',
      bpm: 87,
    } as const satisfies VtgPatternSelection
    const original = createVtgAnimationForSelection(createCurrentAnimation(), selection)
    const transitioned = createVtgAnimationForSelection(createCurrentAnimation(), {
      ...selection,
      transition: true,
    })
    if (!original || !transitioned) throw new Error('Expected normal and transitioned animations')

    const originalCompiled = rootCompile(original)
    const transitionedCompiled = rootCompile(transitioned)

    expect(transitioned.bpm).toBe(original.bpm * doublePlaybackMultiplier)
    expect(transitioned.props[0]!.anim[2]).toEqual({})
    for (const frame of transitioned.props[0]!.anim.slice(1)) {
      expect(frame).not.toHaveProperty('beats')
      expect(frame).not.toHaveProperty('scale')
      expect(frame).not.toHaveProperty('depth')
      expect(frame).not.toHaveProperty('type')
      expect(frame).not.toHaveProperty('adjust')
    }
    for (const [propIndex, originalProp] of originalCompiled.props.entries()) {
      const transitionedFrames = transitionedCompiled.props[propIndex]!.anim
      for (const [frameIndex, originalFrame] of originalProp.anim.slice(0, -1).entries()) {
        const transitionedFrame = transitionedFrames[frameIndex * doublePlaybackMultiplier]!
        expectVectorClose(transitionedFrame.pos, originalFrame.pos)
        expectVectorClose(transitionedFrame.rot, originalFrame.rot)
        expect(transitionedFrame.scale).toBe(originalFrame.scale)
        expect(transitionedFrame.depth).toBe(originalFrame.depth)
      }
    }
  })

  it.each(['1:1', '1:2'] as const)(
    'enables the reciprocal transition at %s only for development builds',
    (speedRatio) => {
      const selection = {
        reference: '5-1',
        speedRatio,
      } as const satisfies VtgPatternSelection
      const original = createVtgAnimationForSelection(createCurrentAnimation(), selection)
      const transitioned = createVtgAnimationForSelection(createCurrentAnimation(), {
        ...selection,
        transition: true,
      })

      expect(supportsVtgQtrTransition(speedRatio)).toBe(true)
      expect(supportsVtgQtrTransition(speedRatio, false)).toBe(false)
      expect(transitioned?.bpm).toBe((original?.bpm ?? 0) * doublePlaybackMultiplier)
    },
  )

  it('rotates only the initial prop arcs by 45 degrees before the final 180 transform', () => {
    const baseSelection = {
      reference: '5-1',
      speedRatio: '1:3',
    } as const satisfies VtgPatternSelection
    const diamond = createVtgAnimationForSelection(createCurrentAnimation(), baseSelection)
    const box = createVtgAnimationForSelection(createCurrentAnimation(), {
      ...baseSelection,
      shape: 'box',
    })
    const reversedBox = createVtgAnimationForSelection(createCurrentAnimation(), {
      ...baseSelection,
      shape: 'box',
      reversePlane: true,
    })
    if (!diamond || !box || !reversedBox) throw new Error('Expected Diamond and Box VTG animations')

    const diamondCompiled = rootCompile(diamond)
    const boxCompiled = rootCompile(box)

    expect(boxCompiled.props.map((prop) => prop.anim[0]!.arc)).toEqual(
      diamondCompiled.props.map((prop) => {
        const firstFrame = prop.anim[0]!
        const delta = Math.abs(firstFrame.plane) === 180 ? -45 : 45
        return (firstFrame.arc + delta + 360) % 360
      }),
    )
    expect(boxCompiled.props.map((prop) => prop.anim.slice(1).map(({ arc }) => arc))).toEqual(
      diamondCompiled.props.map((prop) => prop.anim.slice(1).map(({ arc }) => arc)),
    )
    expect(reversedBox.props.map((prop) => prop.anim[0]?.arc)).toEqual(
      box.props.map((prop) => prop.anim[0]?.arc),
    )
    expect(reversedBox.props.map((prop) => prop.anim[0]?.plane)).toEqual(
      box.props.map((prop) => reverseAngle(prop.anim[0]?.plane ?? 0)),
    )
  })

  it('keeps the eight fixed-shape cells unchanged in Box mode', () => {
    expect([...vtgFixedShapeCells]).toEqual([
      '1-1',
      '1-2',
      '2-1',
      '2-2',
      '3-3',
      '3-4',
      '4-3',
      '4-4',
    ])

    for (const reference of vtgFixedShapeCells) {
      const selection = { reference, speedRatio: '1:3' } as const satisfies VtgPatternSelection
      const diamond = createVtgAnimationForSelection(createCurrentAnimation(), selection)
      const box = createVtgAnimationForSelection(createCurrentAnimation(), {
        ...selection,
        shape: 'box',
      })

      expect(box).toEqual(diamond)
    }
  })

  it('applies Thick to main player data without changing preview thickness', () => {
    const selection = {
      reference: '1-6',
      speedRatio: '1:3',
      thick: 12,
    } as const
    const animation = createVtgAnimation(createCurrentAnimation(), selection)
    const preview = createVtgPreviewAnimation(selection)

    expect(animation?.thick).toBe(12)
    expect(preview?.thick).toBe(15)
  })

  it('applies rendering controls to the player without changing thumbnail rendering', () => {
    const selection = {
      reference: '1-6',
      speedRatio: '1:3',
      paths: false,
      hands: true,
      arms: true,
    } as const
    const animation = createVtgAnimation(createCurrentAnimation(), selection)
    const preview = createVtgPreviewAnimation(selection)
    if (!animation || !preview) throw new Error('Expected player and preview animations')

    expect(animation).toMatchObject({ paths: false, hands: true, arms: true })
    expect(
      rootCompile(animation).props.every(
        (prop) => !prop.paths && prop.hands === true && prop.arms === true,
      ),
    ).toBe(true)
    expect(preview).toMatchObject({ paths: true, hands: false, arms: false })
    expect(
      preview.props.every(
        (prop) => prop.paths === true && prop.hands === false && prop.arms === false,
      ),
    ).toBe(true)
  })

  it('applies prop visibility overrides only to unchecked sides', () => {
    const visible = createVtgAnimationForSelection(createCurrentAnimation(), {
      reference: '1-6',
      speedRatio: '1:3',
    })
    const leftHidden = createVtgAnimationForSelection(createCurrentAnimation(), {
      reference: '1-6',
      speedRatio: '1:3',
      left: false,
    })
    if (!visible || !leftHidden) throw new Error('Expected VTG animations')

    for (const key of ['paths', 'hands', 'arms', 'visible'] as const) {
      expect(visible.props[0]).not.toHaveProperty(key)
      expect(visible.props[1]).not.toHaveProperty(key)
      expect(leftHidden.props[0]?.[key]).toBe(false)
      expect(leftHidden.props[1]).not.toHaveProperty(key)
    }
  })

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
          color: 4,
          anim: [{ plane: 180, arc: 90 }, { plane: 180, arc: 90 }, {}, {}, {}],
        },
        {
          color: 1,
          anim: [{ plane: 180, arc: 90 }, { arc: 90, turns: -180 }, {}, {}, {}],
        },
      ],
    })
    expect(animation?.smooth).toBe(true)
  })

  it('preserves the active playback speed when BPM rebuilds the pattern', () => {
    const current = createCurrentAnimation()
    current.speed = 2

    const animation = createVtgAnimation(current, {
      reference: '1-6',
      speedRatio: '1:3',
      bpm: 90,
    })

    expect(animation).toMatchObject({ bpm: 90, speed: 2 })
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
      arms: false,
      visible: false,
      thick: 15,
    })
    expect(preview.camera[0]!.orbit?.distance).toBe(vtgPlayerSettings.distance)
    expect(preview.props.every((prop) => prop.anim.length === 5)).toBe(true)
    expect(
      preview.props.every(
        (prop) =>
          prop.paths === vtgPlayerSettings.paths &&
          prop.hands === false &&
          prop.arms === false &&
          prop.visible === false &&
          prop.thick === 15,
      ),
    ).toBe(true)
    expect(
      rootCompile(preview).props.every(
        (prop) =>
          prop.hands === false &&
          prop.arms === false &&
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
      { arc: 90, scale: 8 },
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

    expect(animation?.props.map((prop) => prop.color)).toEqual([4, 1])
    expect(animation?.props[0]?.anim.slice(0, 2)).toEqual([{ arc: 90, scale: 8 }, { arc: 90 }])
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

    expect(swapped?.props.map((prop) => prop.color)).toEqual([4, 1])
    expect(swapped?.props[0]?.anim).toEqual(original?.props[1]?.anim)
    expect(swapped?.props[1]?.anim).toEqual(original?.props[0]?.anim)
  })

  it('leaves final Swap and 180 transforms out of the VTG pattern catalog', () => {
    const original = buildVtgPattern({
      reference: '2-6',
      speedRatio: '1:1',
    })
    const reversed = buildVtgPattern({
      reference: '2-6',
      speedRatio: '1:1',
      reversePlane: true,
    })

    expect(original?.props.map((prop) => prop.anim[0]?.plane)).toEqual([180, undefined])
    expect(reversed).toEqual(original)

    const baseAnimation = createDefaultVtgAnimation({
      reference: '5-2',
      speedRatio: '1:1',
    })
    const reversedAnimation = createDefaultVtgAnimation({
      reference: '5-2',
      speedRatio: '1:1',
      reversePlane: true,
    })
    expect(reversedAnimation?.props.map((prop) => prop.anim[0]?.plane)).toEqual(
      baseAnimation?.props.map((prop) => reverseAngle(prop.anim[0]?.plane ?? 0)),
    )
  })

  it('caps BPM and Scale while mapping Scale to Distance', () => {
    expect(vtgPlayerSettings.distance).toBe(18)

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
      { arc: 90, turns: -540 },
    ])
    expect(animation?.props[1]?.anim.slice(0, 2)).toEqual([
      { arc: 90, turns: 180, scale: 8 },
      { plane: 180, arc: 90, turns: 360 },
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
