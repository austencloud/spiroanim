import { Group, Object3D, PerspectiveCamera, Vector2, Vector3 } from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { FRAMESTARTS } from '@/math/animation/PlayerFunc'
import { sampleCompiledMotion, sampleCompiledOrbit } from '@/math/animation/MotionFunc'
import type { CameraDataCompiled, CameraPose } from '@/types/AnimTypes'

interface CameraAnimatorOptions {
  camera: PerspectiveCamera
  scene: Object3D
  frames: readonly CameraDataCompiled[]
  bpm: number
  width: number
  height: number
  timeline: boolean
}

export function createCameraAnimator({
  camera,
  scene,
  frames,
  bpm,
  width: initialWidth,
  height: initialHeight,
  timeline,
}: CameraAnimatorOptions) {
  const times = FRAMESTARTS(
    frames.map((frame) => frame.orbit),
    bpm,
  )
  const orbitFrames = frames.map((frame) => frame.orbit)
  const centerFrames = frames.map((frame) => frame.center)
  const center = new Vector3()
  const orbit = new Vector3()
  const target = new Vector3()
  const guideGroup = new Group()
  let width = initialWidth
  let height = initialHeight
  let manual = false
  let guidesRequested = false
  let exporting = false

  const centerLine = createGuideLine(buildGuidePoints(centerFrames, centerFrames, times, false))
  const orbitLine = createGuideLine(buildGuidePoints(centerFrames, orbitFrames, times, true))
  guideGroup.add(centerLine, orbitLine)
  guideGroup.visible = false
  scene.add(guideGroup)

  const applyAuthoredPose = (milliseconds: number) => {
    sampleCompiledMotion(centerFrames, times, milliseconds, center)
    sampleCompiledOrbit(orbitFrames, times, milliseconds, orbit)
    target.copy(center)
    camera.position.copy(center).add(orbit)
    camera.lookAt(target)
    camera.updateMatrixWorld()
  }

  const updateGuideMaterials = () => {
    const distance = Math.max(camera.position.distanceTo(target), 0.000001)
    const inverseScale = height / (2 * Math.tan((camera.fov * Math.PI) / 360) * distance)
    for (const line of [centerLine, orbitLine]) {
      const material = line.material
      material.resolution.set(width, height)
      material.linewidth = 0.025 * inverseScale
    }
  }

  const updateGuideVisibility = () => {
    guideGroup.visible = guidesRequested && !timeline && !exporting
  }

  return {
    times,
    get target() {
      return target
    },
    get manual() {
      return manual
    },
    seek(milliseconds: number) {
      if (!manual) applyAuthoredPose(milliseconds)
      updateGuideMaterials()
    },
    acquire(): CameraPose {
      manual = true
      return {
        position: camera.position.toArray(),
        target: target.toArray(),
      }
    },
    transform(pose: CameraPose) {
      manual = true
      camera.position.fromArray(pose.position)
      target.fromArray(pose.target)
      camera.lookAt(target)
      camera.updateMatrixWorld()
      updateGuideMaterials()
    },
    release(milliseconds: number) {
      manual = false
      applyAuthoredPose(milliseconds)
      updateGuideMaterials()
    },
    dimensions(canvasWidth: number, canvasHeight: number) {
      width = canvasWidth
      height = canvasHeight
      updateGuideMaterials()
    },
    setGuides(visible: boolean, color: number) {
      guidesRequested = visible
      centerLine.material.color.setHex(color)
      orbitLine.material.color.setHex(color)
      updateGuideVisibility()
    },
    setExporting(value: boolean) {
      exporting = value
      updateGuideVisibility()
    },
  }
}

function createGuideLine(points: readonly Vector3[]): Line2 {
  const linePoints = points.length === 1 ? [points[0]!, points[0]!] : points
  const geometry = new LineGeometry().setPositions(linePoints.flatMap((point) => point.toArray()))
  const material = new LineMaterial({
    color: 0xffffff,
    linewidth: 0.025,
    resolution: new Vector2(1, 1),
  })
  return new Line2(geometry, material)
}

function buildGuidePoints(
  centerFrames: readonly CameraDataCompiled['center'][],
  pathFrames: readonly CameraDataCompiled['center'][],
  times: readonly number[],
  includeCenter: boolean,
): Vector3[] {
  if (pathFrames.length === 0) return [new Vector3()]

  const points: Vector3[] = []
  const centerAt = new Vector3()
  const pathAt = new Vector3()
  const samplesPerFrame = 64

  for (let index = 0; index < pathFrames.length - 1; index++) {
    for (let sample = index === 0 ? 0 : 1; sample <= samplesPerFrame; sample++) {
      const percentage = sample / samplesPerFrame
      const start = times[index] ?? 0
      const end = times[index + 1] ?? start
      const milliseconds = start + (end - start) * percentage
      if (includeCenter) sampleCompiledOrbit(pathFrames, times, milliseconds, pathAt)
      else sampleCompiledMotion(pathFrames, times, milliseconds, pathAt)
      const point = pathAt.clone()
      if (includeCenter) {
        sampleCompiledMotion(centerFrames, times, milliseconds, centerAt)
        point.add(centerAt)
      }
      points.push(point)
    }
  }

  if (points.length > 0) return points
  const point = new Vector3().fromArray(pathFrames[0]!.offset)
  if (includeCenter) point.add(new Vector3().fromArray(centerFrames[0]!.offset))
  return [point]
}
