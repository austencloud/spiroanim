import { PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'

import { rootCompile } from '@/math/animation/AnimFunc'
import {
  cartesianToMotionAngles,
  createDefaultCameraFrame,
  createMotionDirectionState,
} from '@/math/animation/MotionFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { createCameraAnimator } from '@/workers/animation/createCameraAnimator'

const compileCamera = () => {
  const [plane, arc, distance] = cartesianToMotionAngles([10, 0, 0], createMotionDirectionState())
  const root = rootFinal({
    bpm: 60,
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
    props: [],
    aspectx: 16,
    aspecty: 9,
    camera: [
      {
        ...createDefaultCameraFrame(22),
        orbit: { ...createDefaultCameraFrame(22).orbit, beats: 1 },
      },
      { orbit: {}, center: { plane, arc, distance } },
    ],
    thick: 4,
  })
  return rootCompile(root)
}

describe('createCameraAnimator', () => {
  it('samples Center and Orbit while always looking at Center', () => {
    const compiled = compileCamera()
    const camera = new PerspectiveCamera(45, 16 / 9, 0.1, 1000)
    const animator = createCameraAnimator({
      camera,
      scene: new Scene(),
      frames: compiled.camera,
      bpm: compiled.bpm,
      width: 800,
      height: 450,
      timeline: false,
    })

    animator.seek(0)
    expect(camera.position.toArray()).toEqual([0, 0, -22])
    expect(animator.target.toArray()).toEqual([0, 0, 0])

    animator.seek(500)
    expect(camera.position.x).toBeCloseTo(5)
    expect(camera.position.z).toBeCloseTo(-22)
    expect(animator.target.toArray()).toEqual(camera.position.clone().setZ(0).toArray())
  })

  it('holds a manual pose until ownership is released', () => {
    const compiled = compileCamera()
    const camera = new PerspectiveCamera(45, 1, 0.1, 1000)
    const animator = createCameraAnimator({
      camera,
      scene: new Scene(),
      frames: compiled.camera,
      bpm: compiled.bpm,
      width: 400,
      height: 400,
      timeline: false,
    })

    animator.seek(500)
    animator.acquire()
    animator.transform({ position: [4, 5, 6], target: [1, 2, 3] })
    animator.seek(0)
    expect(camera.position.toArray()).toEqual([4, 5, 6])
    expect(animator.target.toArray()).toEqual([1, 2, 3])

    animator.release(0)
    expect(camera.position.toArray()).toEqual([0, 0, -22])
    expect(animator.target.toArray()).toEqual([0, 0, 0])
  })

  it('preserves an authored zero orbit when manual controls acquire ownership', () => {
    const root = rootFinal({
      bpm: 60,
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
      props: [],
      aspectx: 16,
      aspecty: 9,
      camera: [{ orbit: { distance: 0 }, center: {} }],
      thick: 4,
    })
    const compiled = rootCompile(root)
    const camera = new PerspectiveCamera(45, 1, 0.1, 1000)
    const animator = createCameraAnimator({
      camera,
      scene: new Scene(),
      frames: compiled.camera,
      bpm: compiled.bpm,
      width: 400,
      height: 400,
      timeline: false,
    })

    animator.seek(0)
    expect(camera.position.toArray()).toEqual([0, 0, 0])

    expect(animator.acquire()).toEqual({ position: [0, 0, 0], target: [0, 0, 0] })
  })
})
