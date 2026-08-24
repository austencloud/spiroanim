import { describe, expect, it } from 'vitest'

import { createDefaultVtgAnimation } from '@/features/vtg/createVtgAnimation'
import { createDefaultQtrBaseAnimation } from '@/features/vtg/qtr/createQtrAnimation'
import { shiftVtgStartingFrames } from '@/features/vtg/math/shiftVtgStartingBeat'
import { rootCompile } from '@/math/animation/AnimFunc'
import { shiftAnimationFrames } from '@/math/animation/shiftAnimationFrames'
import type { RootDataFinal } from '@/types/AnimTypes'

const shiftRepeatedly = (animation: RootDataFinal, shiftCount: number) => {
  let shifted = animation
  for (let repetition = 0; repetition < shiftCount; repetition += 1) {
    const compiled = rootCompile(shifted)
    const props = shifted.props.map((prop, propIndex) => ({
      ...prop,
      anim: shiftAnimationFrames(prop.anim, compiled.props[propIndex]!.anim)!,
    }))
    shifted = { ...shifted, props }
  }
  return shifted
}

const expectCompiledAnimationsClose = (actual: RootDataFinal, expected: RootDataFinal) => {
  const actualCompiled = rootCompile(actual)
  const expectedCompiled = rootCompile(expected)
  expect(actualCompiled.props.length).toBe(expectedCompiled.props.length)
  for (const [propIndex, actualProp] of actualCompiled.props.entries()) {
    const expectedProp = expectedCompiled.props[propIndex]!
    expect(actualProp.anim.length).toBe(expectedProp.anim.length)
    for (const [frameIndex, actualFrame] of actualProp.anim.entries()) {
      const expectedFrame = expectedProp.anim[frameIndex]!
      for (const key of ['beats', 'scale', 'depth', 'type', 'twist'] as const) {
        expect(actualFrame[key], `${key} at ${propIndex}:${frameIndex}`).toBe(expectedFrame[key])
      }
      for (const key of ['arc', 'turns', 'adjust', 'twistRoll'] as const) {
        expect(actualFrame[key], `${key} at ${propIndex}:${frameIndex}`).toBeCloseTo(
          expectedFrame[key],
          5,
        )
      }
      for (const key of ['plane', 'axis'] as const) {
        const difference =
          ((((actualFrame[key] - expectedFrame[key] + 180) % 360) + 360) % 360) - 180
        expect(difference, `${key} at ${propIndex}:${frameIndex}`).toBeCloseTo(0, 5)
      }
      for (const key of ['pos', 'posx', 'rot', 'rotx', 'adju'] as const) {
        actualFrame[key].forEach((value, axis) =>
          expect(value, `${key}.${axis} at ${propIndex}:${frameIndex}`).toBeCloseTo(
            expectedFrame[key][axis]!,
            5,
          ),
        )
      }
    }
  }
}

describe('shiftVtgStartingFrames', () => {
  it.each([
    [
      'VTG 5-2',
      () => createDefaultVtgAnimation({ reference: '5-2', speedRatio: '2:3', isAnti: false }),
    ],
    [
      'VTG 4-5',
      () => createDefaultVtgAnimation({ reference: '4-5', speedRatio: '2:3', isAnti: false }),
    ],
    [
      'QTR 4-2',
      () =>
        createDefaultQtrBaseAnimation({
          reference: '4-2',
          speedRatio: '2:3',
          quarters: 1,
          isAnti: false,
          swapProps: false,
          reversePlane: false,
        }),
    ],
  ])('matches repeated semantic Shift for every offset in %s', (_name, createAnimation) => {
    const animation = createAnimation()
    expect(animation).toBeDefined()
    const cycleLength = animation!.props[0]!.anim.length - 1

    for (let shiftCount = 0; shiftCount <= cycleLength; shiftCount += 1) {
      const direct = shiftVtgStartingFrames(animation!, shiftCount)
      const repeated = shiftRepeatedly(animation!, shiftCount)
      expect(direct, `shift ${shiftCount}`).toBeDefined()
      expectCompiledAnimationsClose(direct!, repeated)
    }
  })
})
