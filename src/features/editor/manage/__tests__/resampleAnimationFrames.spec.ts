import { describe, expect, it } from 'vitest'

import {
  doubleAnimationFrames,
  halveAnimationFrames,
} from '@/features/editor/manage/resampleAnimationFrames'
import { compressAnimationFrames } from '@/features/editor/manage/compressAnimation'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import type { RootDataFinal } from '@/types/AnimTypes'

const createAnimation = (): RootDataFinal =>
  rootFinal({
    bpm: 120,
    prop: 0,
    color: 0,
    smooth: true,
    guides: false,
    paths: true,
    hands: true,
    arms: false,
    visible: true,
    nodes: false,
    anchors: false,
    props: [
      {
        anim: [
          { beats: 1, turns: 0, scale: 10, depth: 0, adjust: 0, arc: 0 },
          {
            turns: 90,
            twist: 90,
            scale: 20,
            depth: 10,
            adjust: 20,
            arc: 90,
            plane: 45,
            axis: -45,
          },
          { turns: -180, twist: -180, scale: 10, depth: 0, adjust: 0, arc: 180, plane: -90 },
        ],
      },
    ],
    aspectx: 1,
    aspecty: 1,
    distance: 22,
    thick: 4,
  })

const compiledFrameValues = (animation: RootDataFinal) =>
  rootCompile(animation).props.map((prop) =>
    prop.anim.map(
      ({ turns, twist, twistRoll, beats, scale, depth, type, adjust, arc, plane, axis }) => ({
        turns,
        twist,
        twistRoll,
        beats,
        scale,
        depth,
        type,
        adjust,
        arc,
        plane,
        axis,
      }),
    ),
  )

describe('resampleAnimationFrames', () => {
  it('inserts exact intermediate values, doubles BPM, and reverses the result', () => {
    const original = createAnimation()
    const originalSnapshot = structuredClone(original)
    const doubled = doubleAnimationFrames(original)

    expect(original).toEqual(originalSnapshot)
    expect(doubled?.bpm).toBe(240)
    expect(doubled?.props[0]?.anim).toHaveLength(5)
    expect(compressAnimationFrames(doubled!.props[0]!.anim)).toBe(0)
    expect(rootCompile(doubled!).props[0]?.anim[1]).toMatchObject({
      turns: 45,
      twist: 45,
      beats: 1,
      scale: 15,
      depth: 5,
      adjust: 10,
      arc: 45,
      plane: 45,
      axis: -45,
    })
    expect(doubled?.props[0]?.anim[1]?.twist).toBe(45)
    expect(doubled?.props[0]?.anim[2]).not.toHaveProperty('twist')

    const halved = halveAnimationFrames(doubled!)
    expect(halved?.bpm).toBe(120)
    expect(halved?.props[0]?.anim).toHaveLength(3)
    expect(compressAnimationFrames(halved!.props[0]!.anim)).toBe(0)
    expect(halved?.props[0]?.anim[1]?.twist).toBe(90)
    expect(halved?.props[0]?.anim[2]?.twist).toBe(-180)
    expect(compiledFrameValues(halved!)).toEqual(compiledFrameValues(original))
  })

  it('rejects doubled values outside property precision or BPM limits', () => {
    const tenthsTurns = createAnimation()
    tenthsTurns.props[0]!.anim[1]!.turns = 0.2
    expect(rootCompile(doubleAnimationFrames(tenthsTurns)!).props[0]?.anim[1]?.turns).toBe(0.1)

    const fractionalTurns = createAnimation()
    fractionalTurns.props[0]!.anim[1]!.turns = 0.1
    expect(doubleAnimationFrames(fractionalTurns)).toBeUndefined()

    const fractionalScale = createAnimation()
    fractionalScale.props[0]!.anim[1]!.scale = 11
    expect(doubleAnimationFrames(fractionalScale)).toBeUndefined()

    const fractionalArc = createAnimation()
    fractionalArc.props[0]!.anim[1]!.arc = 1
    expect(doubleAnimationFrames(fractionalArc)).toBeUndefined()

    const fractionalTwist = createAnimation()
    fractionalTwist.props[0]!.anim[1]!.twist = 45
    expect(doubleAnimationFrames(fractionalTwist)).toBeUndefined()

    const excessiveBpm = createAnimation()
    excessiveBpm.bpm = 300
    expect(doubleAnimationFrames(excessiveBpm)).toBeUndefined()
  })

  it('rejects halving when alternating frames are not exact generated intermediates', () => {
    const doubled = doubleAnimationFrames(createAnimation())!
    doubled.props[0]!.anim[1]!.turns = 45.1
    doubled.props[0]!.anim[2]!.turns = 45
    expect(halveAnimationFrames(doubled)).toBeUndefined()

    const changedScale = doubleAnimationFrames(createAnimation())!
    changedScale.props[0]!.anim[1]!.scale = 16
    expect(halveAnimationFrames(changedScale)).toBeUndefined()

    const changedContinuation = doubleAnimationFrames(createAnimation())!
    changedContinuation.props[0]!.anim[2]!.plane = 45
    expect(halveAnimationFrames(changedContinuation)).toBeUndefined()
  })

  it('rejects halving incompatible frame counts and unrepresentable halved BPM', () => {
    const evenFrameCount = doubleAnimationFrames(createAnimation())!
    evenFrameCount.props[0]!.anim.pop()
    expect(halveAnimationFrames(evenFrameCount)).toBeUndefined()

    const fractionalBpm = doubleAnimationFrames(createAnimation())!
    fractionalBpm.bpm = 81
    expect(halveAnimationFrames(fractionalBpm)).toBeUndefined()

    const lowBpm = doubleAnimationFrames(createAnimation())!
    lowBpm.bpm = 30
    expect(halveAnimationFrames(lowBpm)).toBeUndefined()
  })

  it('requires at least one interval in the requested direction', () => {
    const singleFrame = createAnimation()
    singleFrame.props[0]!.anim.splice(1)

    expect(doubleAnimationFrames(singleFrame)).toBeUndefined()
    expect(halveAnimationFrames(singleFrame)).toBeUndefined()
  })
})
