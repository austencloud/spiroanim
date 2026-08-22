import { describe, expect, it } from 'vitest'

import {
  toVtgBuilderDisplayAnimation,
  type VtgBuilderDisplaySettings,
} from '@/features/builder/toVtgBuilderDisplayAnimation'
import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import {
  getVtgDistanceForScale,
  toVtgInternalScale,
  vtgThickControl,
} from '@/features/vtg/data/vtgPlayerSettings'
import { rootCompile } from '@/math/animation/AnimFunc'
import { applyVtgCustomization } from '@/features/vtg/applyVtgCustomization'

describe('toVtgBuilderDisplayAnimation', () => {
  it('uses the literal Customize Scale instead of the ratio-adjusted VTG scale', () => {
    const scale = 0.8
    const animation = createDefaultVtgAnimation({
      reference: '1-1',
      speedRatio: '1:5',
      scale,
    })
    if (!animation) throw new Error('Expected a supported VTG pattern')

    const display = toVtgBuilderDisplayAnimation(animation, scale)
    expect(rootCompile(animation).props[0]!.anim[0]!.scale).not.toBe(toVtgInternalScale(scale))
    expect(
      display.props.every(
        (prop, propIndex) =>
          prop.anim[0]?.scale === toVtgInternalScale(scale) &&
          prop.anim
            .slice(1)
            .every(
              (frame, frameIndex) =>
                frame.scale === animation.props[propIndex]?.anim[frameIndex + 1]?.scale,
            ),
      ),
    ).toBe(true)
    expect(
      rootCompile(display).props.every((prop) =>
        prop.anim.every((frame) => frame.scale === toVtgInternalScale(scale)),
      ),
    ).toBe(true)
    expect(display.camera[0]?.orbit?.distance).toBe(getVtgDistanceForScale(scale))
  })

  it('preserves every non-Scale Customize setting for Builder visuals', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a supported VTG pattern')

    const customized = applyVtgCustomization(animation, {
      reference: '1-1',
      speedRatio: '1:3',
      bpm: 91,
      scale: 1.2,
      thick: 9,
      spacing: 7,
      paths: false,
      hands: true,
      arms: false,
      left: false,
      propColors: ['Magenta', 'Yellow'],
    })
    expect(
      customized.props.every((customizedProp, propIndex) =>
        customizedProp.anim
          .slice(1)
          .every(
            (frame, frameIndex) =>
              frame.scale === animation.props[propIndex]?.anim[frameIndex + 1]?.scale,
          ),
      ),
    ).toBe(true)
    const display = toVtgBuilderDisplayAnimation(customized, 1.2)

    expect(display.bpm).toBe(customized.bpm)
    expect(display.thick).toBe(9)
    expect(display.paths).toBe(false)
    expect(display.hands).toBe(true)
    expect(display.arms).toBe(false)
    expect(display.props.map((prop) => prop.motion)).toEqual(
      customized.props.map((prop) => prop.motion),
    )
    expect(display.props[0]).toMatchObject({
      visible: false,
      paths: false,
      hands: false,
      arms: false,
    })
    expect(display.props.map((prop) => prop.color)).toEqual(
      customized.props.map((prop) => prop.color),
    )
  })

  it('overwrites only Builder display fields and keeps thumbnail visibility and thickness fixed', () => {
    const animation = createDefaultVtgAnimation({ reference: '1-1', speedRatio: '1:3' })
    if (!animation) throw new Error('Expected a supported VTG pattern')
    const original = structuredClone(animation)
    const settings = {
      bpm: 91,
      scale: 1.2,
      thick: 9,
      spacing: 7,
      paths: false,
      hands: true,
      arms: false,
      leftPropVisible: false,
      rightPropVisible: true,
      propColors: ['Magenta', 'Yellow'],
      prop: 1,
    } as const satisfies VtgBuilderDisplaySettings

    const player = toVtgBuilderDisplayAnimation(animation, settings)
    const thumbnail = toVtgBuilderDisplayAnimation(animation, settings, { thumbnail: true })

    expect(animation).toEqual(original)
    expect(player).toMatchObject({
      bpm: 182,
      prop: 1,
      paths: false,
      hands: true,
      arms: false,
      thick: 9,
    })
    expect(player.props[0]).toMatchObject({
      visible: false,
      paths: false,
      hands: false,
      arms: false,
      thick: 9,
    })
    expect(player.props[1]).toMatchObject({
      paths: false,
      hands: true,
      arms: false,
      thick: 9,
    })
    expect(thumbnail.thick).toBe(vtgThickControl.max)
    expect(thumbnail.props.every((prop) => prop.visible !== false)).toBe(true)
    expect(
      thumbnail.props.every(
        (prop) =>
          prop.paths === false &&
          prop.hands === true &&
          prop.arms === false &&
          prop.thick === vtgThickControl.max,
      ),
    ).toBe(true)
    expect(player.props.map((prop) => prop.motion)).toEqual(
      thumbnail.props.map((prop) => prop.motion),
    )
    expect(player.props.map((prop) => prop.color)).toEqual(
      thumbnail.props.map((prop) => prop.color),
    )
    expect(
      player.props.every((prop) => prop.anim.slice(1).every((frame) => frame.scale === undefined)),
    ).toBe(true)
  })
})
