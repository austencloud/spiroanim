import { Group, Scene, Vector3, type InterleavedBufferAttribute } from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { describe, expect, it } from 'vitest'

import { COLSET, RADIUS, TTYPE } from '@/domain/animation/AnimStruct'
import { rootCompile } from '@/math/animation/AnimFunc'
import { rootFinal } from '@/math/animation/PlayerFunc'
import { createSpiroAnimator, type LineMaterial2 } from '@/workers/animation/createSpiroAnimator'
import type { RootData } from '@/types/AnimTypes'

const createRoot = (arms: boolean, hands = false): RootData => ({
  bpm: 60,
  prop: 0,
  color: 2,
  smooth: true,
  guides: false,
  paths: false,
  hands,
  arms,
  visible: true,
  nodes: false,
  anchors: false,
  props: [
    {
      anim: [
        { beats: 1, scale: 10, move: [2, 0, 0] },
        { scale: 20, arc: 90 },
      ],
    },
  ],
  aspectx: 16,
  aspecty: 9,
  distance: 22,
  thick: 7,
})

const createAnimator = (arms: boolean, hands = false) => {
  const scene = new Scene()
  const compiled = rootCompile(rootFinal(createRoot(arms, hands)))
  const animator = createSpiroAnimator({
    scene,
    speed: 1,
    girth: 2,
    bpm: compiled.bpm,
    smooth: compiled.smooth,
    prop: compiled.props[0]!,
    completed: () => undefined,
    width: 800,
    height: 600,
    distance: 22,
    fov: 45,
    timeline: false,
  })

  return { animator, scene }
}

describe('createSpiroAnimator Arms rendering', () => {
  it('does not create an arm when Arms is false', () => {
    const { scene } = createAnimator(false)

    expect(scene.getObjectsByProperty('isLine2', true)).toHaveLength(0)
  })

  it('uses the poi handle color and Thick + 4 width while following the scaled hand position', () => {
    const { animator, scene } = createAnimator(true)
    const armLine = scene.getObjectsByProperty('isLine2', true)[0]

    expect(armLine).toBeInstanceOf(Line2)
    if (!(armLine instanceof Line2)) throw new Error('Expected an Arms Line2')

    const material = armLine.material as LineMaterial2
    expect(material.color.getHex()).toBe(COLSET[2]![1])
    expect(material.linewidth2).toBeCloseTo(0.22)

    animator.animate(0, 0, true)
    animator.animate(500, 0, true)

    const start = armLine.geometry.getAttribute('instanceStart') as InterleavedBufferAttribute
    const end = armLine.geometry.getAttribute('instanceEnd') as InterleavedBufferAttribute
    const startPosition = [start.getX(0), start.getY(0), start.getZ(0)] as const
    const armLength = Math.hypot(
      end.getX(0) - startPosition[0],
      end.getY(0) - startPosition[1],
      end.getZ(0) - startPosition[2],
    )

    expect(startPosition).toEqual([1, 0, 0])
    expect(armLength).toBeCloseTo(7.5)

    animator.dimensions(1600, 900, 30, 60)
    expect(material.resolution.toArray()).toEqual([1600, 900])
    expect(material.linewidth).toBeCloseTo((0.22 * 900) / (2 * Math.tan(Math.PI / 6) * 30))
  })

  it('uses the poi tether color for Hands', () => {
    const { scene } = createAnimator(false, true)
    const handLine = scene.getObjectsByProperty('isLine2', true)[0]

    expect(handLine).toBeInstanceOf(Line2)
    if (!(handLine instanceof Line2)) throw new Error('Expected a Hands Line2')

    const material = handLine.material as LineMaterial2
    expect(material.color.getHex()).toBe(COLSET[2]![2])
  })

  it('can hide and restore Arms for image export', () => {
    const { animator, scene } = createAnimator(true)
    const armLine = scene.getObjectsByProperty('isLine2', true)[0]
    if (!(armLine instanceof Line2)) throw new Error('Expected an Arms Line2')

    animator.setExportHidden(['arms'], true)
    expect(armLine.parent?.visible).toBe(false)

    animator.setExportHidden(['arms'], false)
    expect(armLine.parent?.visible).toBe(true)
  })
})

describe('createSpiroAnimator linear scaling', () => {
  it('moves through the straight midpoint between scaled endpoints', () => {
    const root = createRoot(false)
    root.props[0]!.anim[0]!.move = [0, 0, 0]
    root.props[0]!.anim[1]!.type = TTYPE.LINE

    const scene = new Scene()
    const compiled = rootCompile(rootFinal(root))
    const prop = compiled.props[0]!
    const animator = createSpiroAnimator({
      scene,
      speed: 1,
      girth: 2,
      bpm: compiled.bpm,
      smooth: compiled.smooth,
      prop,
      completed: () => undefined,
      width: 800,
      height: 600,
      distance: 22,
      fov: 45,
      timeline: false,
    })
    const modelGroup = scene.children.find(
      (child): child is Group =>
        child instanceof Group && child.children.some((item) => 'size' in item),
    )
    if (!modelGroup) throw new Error('Expected the animated model group')

    animator.animate(0, 0, true)
    animator.animate(500, 0, true)

    const start = new Vector3()
      .fromArray(prop.anim[0]!.pos)
      .multiplyScalar((RADIUS * prop.anim[0]!.scale) / 10)
    const end = new Vector3()
      .fromArray(prop.anim[1]!.pos)
      .multiplyScalar((RADIUS * prop.anim[1]!.scale) / 10)
    const expectedMidpoint = start.lerp(end, 0.5)

    expect(modelGroup.position.distanceTo(expectedMidpoint)).toBeCloseTo(0)
  })
})
