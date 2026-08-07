import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'

import { MOTION_SHAPE } from '@/domain/animation/AnimStruct'
import { rootCompile } from '@/math/animation/AnimFunc'
import {
  cartesianToMotionAngles,
  clampCartesianMotion,
  compileMotionTrack,
  createMotionDirectionState,
  fitMotionPathEndpoint,
  motionAnglesToCartesian,
  motionPathOffset,
  sampleCompiledOrbit,
} from '@/math/animation/MotionFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'

describe('Motion angle conversion', () => {
  it('inherits Beats through consecutive empty frames', () => {
    expect(compileMotionTrack([{ beats: 3 }, {}, {}]).map((frame) => frame.beats)).toEqual([
      3, 3, 3,
    ])
  })

  it('converts Cartesian movements into equivalent chained angles', () => {
    const cartesian = [
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, -4],
    ] as const
    const encodeState = createMotionDirectionState()
    const angular = cartesian.map((move) => cartesianToMotionAngles(move, encodeState))
    const decodeState = createMotionDirectionState()
    const restored = angular.map((move) => motionAnglesToCartesian(move, decodeState))

    restored.forEach((move, index) => {
      expect(move[0]).toBeCloseTo(cartesian[index]![0], 6)
      expect(move[1]).toBeCloseTo(cartesian[index]![1], 6)
      expect(move[2]).toBeCloseTo(cartesian[index]![2], 6)
    })
  })

  it('rounds Cartesian edits and clamps their combined Distance', () => {
    expect(clampCartesianMotion([12.4, -8.6, 3.5])).toEqual([12, -9, 4])
    expect(clampCartesianMotion([62, 62, 62])).toEqual([35, 35, 35])
  })
})

describe('Motion paths', () => {
  const direction = [1, 0, 0] as const
  const curve = [0, 1, 0] as const

  it('uses Distance for Linear and for a zero-Amount Circle', () => {
    expect(
      motionPathOffset(direction, curve, 10, MOTION_SHAPE.LINE, 100, 1, new Vector3()).toArray(),
    ).toEqual([10, 0, 0])
    expect(
      motionPathOffset(direction, curve, 10, MOTION_SHAPE.CIRCLE, 0, 1, new Vector3()).toArray(),
    ).toEqual([10, 0, 0])
  })

  it('samples Linear Orbit around Center instead of through its Cartesian chord', () => {
    const frames = compileMotionTrack([{ distance: 10 }, { distance: 10 }])
    frames[0]!.offset = [0, 0, -10]
    frames[1]!.offset = [10, 0, 0]
    const orbitMidpoint = sampleCompiledOrbit(frames, [0, 1000], 500, new Vector3())
    const cartesianMidpoint = new Vector3(0, 0, -10).lerp(new Vector3(10, 0, 0), 0.5)

    expect(orbitMidpoint.length()).toBeCloseTo(10)
    expect(cartesianMidpoint.length()).toBeCloseTo(Math.sqrt(50))
    expect(orbitMidpoint.x).toBeCloseTo(Math.sqrt(50))
    expect(orbitMidpoint.z).toBeCloseTo(-Math.sqrt(50))
  })

  it('keeps a 50% Circle anchored to Linear and closes it at 100%', () => {
    const linearEndpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.LINE,
      100,
      1,
      new Vector3(),
    )
    const semicircleEndpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.CIRCLE,
      50,
      1,
      new Vector3(),
    )
    const semicircleMidpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.CIRCLE,
      50,
      0.5,
      new Vector3(),
    )
    const circleMidpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.CIRCLE,
      100,
      0.5,
      new Vector3(),
    )
    const circleEndpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.CIRCLE,
      100,
      1,
      new Vector3(),
    )

    expect(semicircleEndpoint.toArray()).toEqual(linearEndpoint.toArray())
    expect(semicircleMidpoint.x).toBeCloseTo(5)
    expect(semicircleMidpoint.y).toBeCloseTo(5)
    expect(semicircleMidpoint.z).toBeCloseTo(0)
    expect(circleMidpoint.distanceTo(linearEndpoint)).toBeCloseTo(0)
    expect(circleEndpoint.length()).toBeCloseTo(0)
  })

  it('fits the closest constrained endpoint for a Circle beyond its semicircle', () => {
    const state = createMotionDirectionState()
    const angles = fitMotionPathEndpoint([8, 3, -4], state, MOTION_SHAPE.CIRCLE, 75, 20)
    const [frame] = compileMotionTrack([
      { plane: angles[0], arc: angles[1], distance: angles[2], shape: 2, amount: 75, axis: 20 },
    ])

    expect(new Vector3().fromArray(frame!.offset).distanceTo(new Vector3(8, 3, -4))).toBeLessThan(1)
    expect(
      fitMotionPathEndpoint(
        [8, 3, -4],
        createMotionDirectionState(),
        MOTION_SHAPE.CIRCLE,
        100,
        0,
      )[2],
    ).toBe(0)
  })

  it('keeps a 100% long Arc anchored to the Linear endpoint', () => {
    const endpoint = motionPathOffset(direction, curve, 10, MOTION_SHAPE.ARC, 100, 1, new Vector3())
    const midpoint = motionPathOffset(
      direction,
      curve,
      10,
      MOTION_SHAPE.ARC,
      100,
      0.5,
      new Vector3(),
    )

    expect(endpoint.toArray()).toEqual([10, 0, 0])
    expect(midpoint.y).toBeGreaterThan(10)
  })

  it('inherits Shape and Amount while empty frames hold and Distance remains zero', () => {
    const compiled = rootCompile(
      rootFinal({
        bpm: 60,
        prop: 0,
        color: 0,
        smooth: true,
        guides: false,
        paths: false,
        hands: false,
        arms: false,
        visible: true,
        nodes: false,
        anchors: false,
        props: [
          {
            anim: [{}],
            motion: [
              { beats: 1, distance: 10, shape: MOTION_SHAPE.CIRCLE, amount: 100 },
              { beats: 2 },
              { distance: 10 },
            ],
          },
        ],
        aspectx: 1,
        aspecty: 1,
        distance: 22,
        thick: 4,
      }),
    ).props[0]!.motion

    expect(compiled[1]).toMatchObject({
      beats: 2,
      distance: 0,
      shape: MOTION_SHAPE.CIRCLE,
      amount: 100,
      active: false,
      offset: compiled[0]!.offset,
    })
    expect(compiled[2]).toMatchObject({
      distance: 10,
      shape: MOTION_SHAPE.CIRCLE,
      amount: 100,
      active: true,
    })
  })
})
