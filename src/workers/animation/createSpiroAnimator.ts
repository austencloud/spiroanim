// Animates a single prop - Used in Player Worker

import {
  Vector3,
  Vector2,
  Quaternion,
  MathUtils,
  Scene,
  SphereGeometry,
  Mesh,
  MeshToonMaterial,
  Group,
  CatmullRomCurve3,
  type InterleavedBufferAttribute,
} from 'three'

import {
  POINTS,
  TTYPE,
  PPROP,
  GUIDES,
  PROPSR,
  CMODES,
  COLSET,
  RADIUS,
  ORIGRADIUS,
  PTYPE,
  PPOS,
  gsize,
  /*rsize,*/
} from '@/domain/animation/AnimStruct'

import { InitialPoint, InitialOrtho } from '@/math/animation/OrthogonalFunc'
import { motionPathOffset, sampleCompiledMotion } from '@/math/animation/MotionFunc'

import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'

import type { ImageExportFeature } from '@/types/ImageExportTypes'
import type {
  PropDataCompiled,
  PointInd,
  ModelGroup,
  PPropKeys,
  PointTypes,
} from '@/types/AnimTypes'

export type LineMaterial2 = LineMaterial & {
  linewidth2: number
  depthCenterUniform?: { value: number }
  depthRangeUniform?: { value: number }
}

import * as props from '@/domain/animation/AnimModels'
import { closestPoint } from '@/math/animation/AnimFunc'
import { FRAMESTARTS } from '@/math/animation/PlayerFunc'

const multi = RADIUS / ORIGRADIUS, // Multiplier for sizes
  // Used for individual calculations (not used over animating loop)
  //axis1 = new Vector3(1,0,0),
  axis2 = new Vector3(0, 1, 0),
  axis3 = new Vector3(0, 0, 1),
  identity = new Quaternion().identity(),
  Adju = new Vector3(),
  blendedRotation = new Quaternion(),
  crot = new Vector3()

const createMarkerMaterial = (color: number) =>
  new MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.025 })

export const createSpiroAnimator = (vars: {
  scene: Scene
  speed: number
  girth: number
  bpm: number
  smooth: boolean
  prop: PropDataCompiled
  completed: () => void
  width: number
  height: number
  distance: number
  fov: number
  timeline: boolean
}): {
  index: number
  AnimStart: number
  playing: boolean
  readonly click: number
  readonly pobjs: Record<number, Mesh>
  setExportHidden: (features: readonly ImageExportFeature[], hidden: boolean) => void
  setProgressivePaths: (enabled: boolean) => void
  setDoublePaths: (enabled: boolean) => void
  animate: (time: number, forward?: number, force?: boolean) => void
  seek: (milliseconds: number) => void
  dimensions: (
    canvasWidth: number,
    canvasHeight: number,
    cameraDistance: number,
    cameraFov: number,
  ) => void
} => {
  let width = vars.width,
    height = vars.height,
    distance = vars.distance,
    fov = vars.fov

  const scene = vars.scene, // Three.js Scene
    completed = vars.completed, // Callback to execute when the entire animation is complete
    bpm = vars.bpm, // Beats Per Minute
    speed = vars.speed, // Playback Speed (applied after BPM)
    smooth = vars.smooth ?? true, // Angle smoothing
    girth = vars.girth, // Adjust girth of prop
    data = vars.prop, // Prop Data originating from Main Thread
    timeline = vars.timeline, // Whether this is displaying on the timeline or not
    anim = data.anim, // Animation Instructions
    motion = data.motion, // Independent translation instructions
    prop = data.prop ?? 0, // Model displayed for the Prop
    color = data.color ?? 0, // Color of the model
    click = data.click ?? -1, // Whether or not the UI is requesting click events
    active = data.active ?? false, // If selected in the editor
    guides = data.guides ?? false,
    paths = data.paths ?? true,
    travel = data.travel ?? false,
    hands = data.hands ?? true,
    arms = data.arms ?? false,
    visible = data.visible ?? true,
    nodes = data.nodes ?? true,
    rsize = (data.thick ?? 4) * 0.01,
    pobjs: Record<number, Mesh> = {}, // Three.js objects for the Points
    guidesGroup: Group = new Group(),
    anchorsGroup: Group = new Group(),
    nodesGroup: Group = new Group(),
    pathsGroup: Group = new Group(),
    additionalPathsGroup: Group = new Group(),
    travelGroup: Group = new Group(),
    handsGroup: Group = new Group(),
    armsGroup: Group = new Group(),
    motionGroup: Group = new Group(),
    modelGroup: Group = new Group(),
    modelProp: ModelGroup = props[PROPSR[prop]](multi, color, girth),
    // Vectors used for computations over continuous cycles
    Rot = new Vector3(), // Initial Rotation
    RotX = new Vector3(), // Direction we're rotating
    Pos = new Vector3(), // Position of the Prop
    Pos2 = new Vector3(), // Second point used for linear animations
    scaledPos2 = new Vector3(), // Scaled endpoint used for linear animations
    PosX = new Vector3(), // Direction we're animating for spherical animations
    rotationDiff = new Quaternion(),
    pointPositions = new Map(),
    posLines: Line2[] = [],
    rotLines: Line2[] = [],
    pathMotionOffset = new Vector3(),
    pathSampleTimes: number[] = [],
    progressivePathLines: Line2[] = [],
    motionTimes = FRAMESTARTS(motion, bpm),
    animationTimes = FRAMESTARTS(anim, bpm)

  let apoint: Mesh,
    armPositionAttribute: InterleavedBufferAttribute | undefined,
    anchors = data.anchors ?? true,
    playing = true,
    loop = 0,
    // Values set at the start of each animation frame
    index = 0,
    AnimStart = 0,
    AnimDuration = 0,
    PathType = 0,
    angleApply = 0,
    RotationPerform = 0,
    scale1 = 0,
    scale2 = 0,
    depth1 = 0,
    depth2 = 0,
    psize: PPropKeys = 'size',
    scaleDiff = 0,
    scalePerc = 0,
    depthDiff = 0,
    depthPerc = 0,
    pathsIndex = -1,
    progressivePaths = false,
    currentMilliseconds = 0

  const updateProgressivePaths = () => {
    let low = 0
    let high = pathSampleTimes.length
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (pathSampleTimes[middle]! <= currentMilliseconds) low = middle + 1
      else high = middle
    }
    const visibleSegments = Math.max(0, low - 1)
    for (const line of progressivePathLines) {
      const geometry = line.geometry as LineGeometry
      geometry.instanceCount = progressivePaths
        ? visibleSegments
        : Math.max(0, pathSampleTimes.length - 1)
    }
  }

  modelProp.visible = visible
  pathsGroup.add(additionalPathsGroup)

  const setup = (time: number, forward = 0 /*, force = false*/) => {
      const p1 = anim[index]!,
        p2 = anim[index + 1] ?? p1

      //if ( ! force && anim[index+1] === undefined )
      //  return

      AnimStart = time - forward // Allows us to fast forward a number of milliseconds
      AnimDuration = Math.round(60000 / bpm) * p1.beats * speed

      PathType = p2.type

      Rot.fromArray(p1.rot) // Initial rotation
      Pos.fromArray(p1.pos) // Initial position
      Pos2.fromArray(p2.pos) // Final position - for linear animations

      RotX.fromArray(p2.rotx) // Rotation direction
      PosX.fromArray(p2.posx) // Position direction for Spherical Animations

      // For spherical animations, we add the Arc to Rotation
      angleApply = PathType == TTYPE.LINE ? 0 : MathUtils.degToRad(p2.arc)

      RotationPerform = MathUtils.degToRad(p2.turns + p2.adjust)

      scale1 = p1.scale / 10
      scale2 = p2.scale / 10
      scaleDiff = scale2 - scale1
      depth1 = p1.depth / 10
      depth2 = p2.depth / 10
      depthDiff = depth2 - depth1

      // The following was updated to reflect changes in the path / rotation lines
      // Keeping for now in case I find a reason they need to be added back in
      //if (index > 0 || force)
      // Allows easing between rotations when replaying
      Adju.fromArray(p1.adju)
      //else Adju.fromArray(anim[anim.length - 1].adju)

      // Adjust: Rotation Blending
      if (smooth) rotationDiff.setFromUnitVectors(Rot, Adju)
      else rotationDiff.identity() // No blending

      //for (let i = 0; i < posLines.length; i++)
      //  posLines[i].visible = rotLines[i].visible = i + 1 == index

      loop = 0
    },
    // Values for transforming positions
    trans = (perc: number) => {
      scalePerc = scale1 + scaleDiff * perc
      depthPerc = depth1 + depthDiff * perc
    },
    // Calculates positions / rotations in an animation
    calc = (time: number) => {
      // Percentage and Values to apply
      const perc = (time - AnimStart) / AnimDuration

      trans(perc)

      // Update
      const pathsCurInd = perc == 0 && !timeline ? index - 1 : index
      if (pathsCurInd !== pathsIndex) {
        pathsIndex = pathsCurInd
        for (let i = 0; i < rotLines.length; i++)
          if (rotLines.length) rotLines[i]!.visible = i + 1 == pathsCurInd
        for (let i = 0; i < posLines.length; i++)
          if (posLines.length) posLines[i]!.visible = i + 1 == pathsCurInd
      }

      // Apply Depth
      if (depthDiff || loop == 0) modelProp.position.y = modelProp.size * depthPerc

      // Update Scale for Points and Guides
      if (scaleDiff || loop == 0) {
        // Scale the visible guides
        guidesGroup.children.forEach((guide) => {
          if (guide.visible) guide.scale.set(scalePerc, scalePerc, scalePerc)
        })

        // Update positions of visible points
        anchorsGroup.children.forEach((sphere) => {
          if (sphere.visible)
            sphere.position.copy(pointPositions.get(sphere)).multiplyScalar(scalePerc)
        })
      }

      // Animates between points
      if (PathType == TTYPE.SPHE) {
        // Spherical

        modelGroup.position
          .copy(Pos)
          .applyAxisAngle(PosX, perc * angleApply)
          .multiplyScalar(scalePerc)
      } else if (PathType == TTYPE.LINE) {
        // Linear

        modelGroup.position
          .copy(Pos)
          .multiplyScalar(scale1)
          .lerp(scaledPos2.copy(Pos2).multiplyScalar(scale2), perc)
      }

      // Apply Radius (Scale is applied by the path-specific branch above)
      modelGroup.position.multiplyScalar(RADIUS)

      // Keep the arm connected to the moving animation center and the hand / prop origin.
      if (armPositionAttribute) {
        const positions = armPositionAttribute.data.array
        positions[0] = 0
        positions[1] = 0
        positions[2] = 0
        positions[3] = modelGroup.position.x
        positions[4] = modelGroup.position.y
        positions[5] = modelGroup.position.z
        armPositionAttribute.needsUpdate = true
      }

      // Calculate the current rotation based on RotationPerform and angleApply
      crot.copy(Rot).applyAxisAngle(RotX, perc * angleApply + RotationPerform * perc)

      // Update active point before blending
      if (apoint && !timeline) apoint.position.copy(crot).multiplyScalar(RADIUS * scalePerc)

      // Apply the blended quaternion to crot
      if (smooth)
        crot.applyQuaternion(
          // Blend rotationDiff based on percNeg (interpolating between identity quaternion and rotationDiff)
          blendedRotation.copy(rotationDiff).slerp(identity, perc), // Gradual interpolation
        )

      // Apply Rotation to the modelGroup
      modelGroup.quaternion.setFromUnitVectors(axis2, crot)

      loop++
    },
    motionOffsetAt = (milliseconds: number, target: Vector3) => {
      return sampleCompiledMotion(motion, motionTimes, milliseconds, target, (RADIUS * multi) / 10)
    },
    applyMotion = (milliseconds: number) => {
      motionOffsetAt(milliseconds, motionGroup.position)
    },
    seek = (milliseconds: number) => {
      currentMilliseconds = milliseconds
      updateProgressivePaths()
      applyMotion(milliseconds)
      if (anim.length === 0) return

      const animationMilliseconds = Math.min(milliseconds, animationTimes.at(-1) ?? 0)
      let frameIndex = animationTimes.length - 1
      for (let i = 0; i < animationTimes.length - 1; i++) {
        if (animationMilliseconds < animationTimes[i + 1]!) {
          frameIndex = i
          break
        }
      }

      const start = animationTimes[frameIndex] ?? 0
      index = frameIndex
      setup(0)
      index = frameIndex + 1
      calc(Math.max(0, animationMilliseconds - start) * speed)
    },
    // Primary animation routine
    animate = (time: number | undefined, forward = 0, force = false) => {
      // force is used with the JUMP command, allowing us to draw the final position
      // This also prevents completed() from being executed, etc.

      if (anim.length < 1) return

      if (time === undefined) time = performance.now()

      if (!playing && !force) return

      // Setup next animation
      if (time >= AnimStart + AnimDuration || time == AnimStart) {
        // if at the end, go back to the first animation
        if (index == anim.length - 1 && !force) {
          index = 0
          playing = false
          completed()
          return
        }

        setup(time, forward /*, force*/)

        index++
      }

      calc(time)
    },
    // Triggered by worker when dimensions change
    dimensions = (
      canvasWidth: number,
      canvasHeight: number,
      cameraDistance: number,
      cameraFov: number,
    ) => {
      width = canvasWidth
      height = canvasHeight
      distance = cameraDistance
      fov = cameraFov

      updateLines()
    },
    // LineMaterial dimensions and linewidth needs to be scaled based on camera
    updateLines = (lineMats = lineMaterials) => {
      const radFov = fov * (Math.PI / 180), // Convert FOV to radians
        inverseScaleFactor = height / (2 * Math.tan(radFov / 2) * distance) // Adjust based on canvas height

      // Update resolution for each stored LineMaterial
      lineMats.forEach((material) => {
        material.linewidth = material.linewidth2 * inverseScaleFactor
        material.resolution.set(width, height)
        if (material.depthCenterUniform) material.depthCenterUniform.value = distance
        if (material.depthRangeUniform)
          material.depthRangeUniform.value = Math.max(distance * 0.3, 1)
      })
    },
    lineMaterials: LineMaterial2[] = [],
    createLine2 = (
      points: Vector3[],
      color: number,
      linewidth: number,
      flowContour = false,
      contourOffset = 0,
    ) => {
      const geometry = new LineGeometry().setPositions(points.flatMap((point) => point.toArray()))
      if (flowContour && points.length > 1) {
        const colors = points.flatMap((_point, index) => {
          const phase = (index / (points.length - 1)) * Math.PI * 6 + contourOffset
          const intensity = 0.32 + (Math.sin(phase) * 0.5 + 0.5) * 0.68
          return [intensity, intensity, intensity]
        })
        geometry.setColors(colors)
      }
      const lineMaterial = new LineMaterial({
          color: color,
          linewidth: linewidth, // Line thickness in pixels
          resolution: new Vector2(width, height), // Required for LineMaterial
          vertexColors: flowContour,
        }) as LineMaterial2,
        line = new Line2(geometry, lineMaterial)

      // Store linewidth for updateLines() to reference
      lineMaterial.linewidth2 = linewidth

      if (flowContour) {
        lineMaterial.depthCenterUniform = { value: distance }
        lineMaterial.depthRangeUniform = { value: Math.max(distance * 0.3, 1) }
        lineMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.propLineDepthCenter = lineMaterial.depthCenterUniform!
          shader.uniforms.propLineDepthRange = lineMaterial.depthRangeUniform!
          shader.vertexShader = shader.vertexShader
            .replace(
              'uniform vec2 resolution;',
              `uniform vec2 resolution;
               varying float vPropLineViewDepth;`,
            )
            .replace(
              'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
              `vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );
               vPropLineViewDepth = -((position.y < 0.5) ? start.z : end.z);`,
            )
          shader.fragmentShader = shader.fragmentShader
            .replace(
              'uniform float linewidth;',
              `uniform float linewidth;
               uniform float propLineDepthCenter;
               uniform float propLineDepthRange;
               varying float vPropLineViewDepth;`,
            )
            .replace(
              'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
              `float propLineDepthDelta = clamp(
                 (vPropLineViewDepth - propLineDepthCenter) / propLineDepthRange,
                 -1.0,
                 1.0
               );
               diffuseColor.rgb *= 1.0 - propLineDepthDelta * 0.12;
               gl_FragColor = vec4( diffuseColor.rgb, alpha );`,
            )
        }
      }

      // Track material for resolution / linewidth updates
      lineMaterials.push(lineMaterial)

      //line.computeLineDistances() // Needed for dashed lines; safe to call regardless
      return line
    }

  if (arms) {
    const armLine = createLine2(
      [new Vector3(), new Vector3()],
      COLSET[color]![1],
      (rsize + 0.04) * girth * multi,
    )
    const armGeometry = armLine.geometry as LineGeometry
    const armMaterial = armLine.material as LineMaterial2
    armMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
        `float armSurfaceHighlight = pow(max(0.0, 1.0 - abs(vUv.x + 0.18)), 2.0);
         diffuseColor.rgb *= 1.0 + armSurfaceHighlight * 0.06;
         gl_FragColor = vec4( diffuseColor.rgb, alpha );`,
      )
    }

    // The arm's bounds move every frame; bypass stale bounds instead of recomputing them each tick.
    armLine.frustumCulled = false
    armPositionAttribute = armGeometry.getAttribute('instanceStart') as InterleavedBufferAttribute
    armsGroup.add(armLine)
  }

  if (travel && motion.length > 1) {
    const travelPoints: Vector3[] = [
      new Vector3()
        .fromArray(motion[0]!.offset)
        .divideScalar(10)
        .multiplyScalar(RADIUS * multi),
    ]
    const travelOffset = new Vector3()
    const travelDelta = new Vector3()
    const samplesPerFrame = 64

    for (let frameIndex = 0; frameIndex < motion.length - 1; frameIndex++) {
      const current = motion[frameIndex]!
      const next = motion[frameIndex + 1]!
      travelOffset.fromArray(current.offset)

      for (let sample = 1; sample <= samplesPerFrame; sample++) {
        motionPathOffset(
          next.direction,
          next.curve,
          next.distance,
          next.shape,
          next.amount,
          sample / samplesPerFrame,
          travelDelta,
        )
        travelPoints.push(
          travelOffset
            .clone()
            .add(travelDelta)
            .divideScalar(10)
            .multiplyScalar(RADIUS * multi),
        )
      }
    }

    travelGroup.add(createLine2(travelPoints, COLSET[color]![2], rsize * girth * multi))
  }

  if (click == CMODES.points) {
    psize = 'click'
    anchors = true
  }

  if (active && !timeline) {
    const rot1Mat = createMarkerMaterial(COLSET[color]![0])
    apoint = new Mesh(rot1Geo, rot1Mat)
    apoint.scale.set(girth, girth, girth)
    motionGroup.add(apoint)

    apoint.visible = false // disabled for now
  }

  // Build Anchors
  if (anchors) {
    const geoType = psize == 'click' ? 'geoclick' : 'geometry'
    for (let i = 0; i < POINTS.length; i++) {
      const key = i as PointInd,
        p = POINTS[key]![0],
        sphere = new Mesh(PointMat[p]![geoType], PointMat[p]!.material)

      pobjs[key] = sphere
      sphere.position.copy(PPOS[key]!).multiplyScalar(RADIUS)

      anchorsGroup.add(sphere)
      pointPositions.set(sphere, sphere.position.clone())
    }
  }

  // Build Nodes and Path / Rotation lines
  if (nodes || paths || hands || active) {
    const posTmp: Vector3[] = [],
      rotTmp: Vector3[] = [],
      additionalRotTmp = (modelProp.additionalPathEndOffsets ?? []).map(() => [] as Vector3[]),
      geoType = 'geonode',
      ppos = new Vector3()

    for (let i = 0; i < anim.length - 1; i++) {
      index = i // used in setup()
      setup(0) // animation routine which sets up the keyframe and values used below
      trans(0)

      // Build Nodes
      if (nodes) {
        ppos.fromArray(anim[i]!.pos)

        const p = POINTS[closestPoint(ppos)]![0],
          sphere = new Mesh(PointMat[p]![geoType], PointMat[p]!.matnode)

        sphere.position
          .copy(ppos)
          .multiplyScalar(RADIUS * scalePerc)
          .add(motionOffsetAt(animationTimes[i] ?? 0, pathMotionOffset))

        nodesGroup.add(sphere)
        pointPositions.set(sphere, sphere.position.clone())
      }

      // Build Paths / Rotation Lines
      if (paths || hands || active) {
        let posPoints: Vector3[] = [],
          rotPoints: Vector3[] = []

        const segmentStart = animationTimes[i] ?? 0,
          segmentEnd = animationTimes[i + 1] ?? segmentStart,
          samplePercentages = Array.from({ length: catmCount }, (_, j) => j / (catmCount - 1))

        if (segmentEnd > segmentStart) {
          for (const time of motionTimes) {
            if (time > segmentStart && time < segmentEnd)
              samplePercentages.push((time - segmentStart) / (segmentEnd - segmentStart))
          }
          samplePercentages.sort((a, b) => a - b)
        }

        const uniqueSamplePercentages = samplePercentages.filter(
            (percentage, sampleIndex) =>
              sampleIndex === 0 || percentage !== samplePercentages[sampleIndex - 1],
          ),
          stepPos = Pos.clone().multiplyScalar(RADIUS)

        if (paths || hands)
          pathSampleTimes.push(
            ...uniqueSamplePercentages.map(
              (percentage) => segmentStart + (segmentEnd - segmentStart) * percentage,
            ),
          )

        // Spherical Path
        if (PathType == TTYPE.SPHE)
          posPoints = catmPointsAt(angleApply, stepPos, PosX, uniqueSamplePercentages)
        // Linear Path
        else {
          stepPos.multiplyScalar(scale1)
          const stepPos2 = Pos2.clone().multiplyScalar(RADIUS * scale2)
          for (const percentage of uniqueSamplePercentages)
            posPoints.push(stepPos.clone().lerp(stepPos2, percentage))
        }

        // Rotation Path
        rotPoints = catmPointsAt(
          angleApply + RotationPerform,
          Rot.clone().multiplyScalar(modelProp.size),
          RotX,
          uniqueSamplePercentages,
        )

        const cRot = new Vector3()

        // Update positions to include scale, depth, and adjustment
        for (let j = 0; j < posPoints.length; j++) {
          // Include both endpoints so consecutive path segments share the same seam position.
          const perc = uniqueSamplePercentages[j]!,
            sampleTime = segmentStart + (segmentEnd - segmentStart) * perc,
            pos = posPoints[j]!,
            rot = rotPoints[j]!

          // Rotation interpolation caused by ADJUST property
          if (smooth)
            //&& index > 0) // No blending for first item
            // 1. Not sure why I did this originally? But removal resolved the first frame's ADJUST property
            // 2. Found the issue: when setting the second frame Adjust while leaving the first at 0, the hand path line is incorrect!
            // 3. Commenting out index > 0 logic with Adju in setup() seems to make everything work!
            rot.applyQuaternion(blendedRotation.copy(rotationDiff).slerp(identity, perc))

          // Copy of rot, after adjustment
          cRot.copy(rot)
          const pathEndAxis = rot.clone()

          // Position Transformations
          trans(perc)
          if (PathType == TTYPE.SPHE) pos.multiplyScalar(scalePerc)
          rot.multiplyScalar(1 + depthPerc)

          // Add posPoints to rotPoints (creating a "helix" around the path)
          rot.add(posPoints[j]!)

          // Apply depth to copy of rot, and add to the position
          pos.add(cRot.multiplyScalar(depthPerc))

          // Paths and Hands remain in world space. Motion is sampled at the same absolute time as
          // each point so the completed geometry records where the animation traveled.
          motionOffsetAt(sampleTime, pathMotionOffset)
          rot.add(pathMotionOffset)
          pos.add(pathMotionOffset)

          if (paths)
            for (let endIndex = 0; endIndex < additionalRotTmp.length; endIndex++) {
              const offset = modelProp.additionalPathEndOffsets?.[endIndex]
              if (offset !== undefined)
                additionalRotTmp[endIndex]!.push(pos.clone().addScaledVector(pathEndAxis, offset))
            }
        }

        // Collect paths into one collection if enabled
        //if (paths && !(active && !timeline)) rotTmp.push(...rotPoints) // Only the one when selected
        if (paths) rotTmp.push(...rotPoints)
        else if (active) {
          // Otherwise create individual lines for each frame
          const rotLine = createLine2(rotPoints, COLSET[color]![0], rsize * girth * multi, true)
          rotLines.push(rotLine)
          scene.add(rotLine)
        }

        // Collect hands into one collection if enabled
        //if (hands && !(active && !timeline)) posTmp.push(...posPoints) // Only the one when selected
        if (hands) posTmp.push(...posPoints)
        else if (active) {
          // Otherwise create individual lines for each frame
          const posLine = createLine2(
            posPoints,
            COLSET[color]![2],
            rsize * girth * multi,
            true,
            Math.PI,
          )
          posLines.push(posLine)
          scene.add(posLine)
        }
      }
    }

    // If Motion outlasts Animation, the final animated pose continues traveling. Extend the
    // baked world-space lines through the remaining Motion boundaries instead of moving the
    // already-completed geometry as a group.
    const animationEnd = animationTimes.at(-1) ?? 0
    const motionEnd = motionTimes.at(-1) ?? 0
    const lastAnimation = anim.at(-1)
    if (lastAnimation && motionEnd > animationEnd && (paths || hands)) {
      const finalPosition = new Vector3()
        .fromArray(lastAnimation.pos)
        .multiplyScalar((RADIUS * lastAnimation.scale) / 10)
      const finalRotation = new Vector3()
        .fromArray(lastAnimation.rot)
        .multiplyScalar(modelProp.size)
      const finalHand = finalPosition
        .clone()
        .add(finalRotation.clone().multiplyScalar(lastAnimation.depth / 10))
      const finalPath = finalPosition
        .clone()
        .add(finalRotation.clone().multiplyScalar(1 + lastAnimation.depth / 10))
      const finalAdditionalPaths = (modelProp.additionalPathEndOffsets ?? []).map((offset) =>
        finalHand.clone().addScaledVector(finalRotation, offset),
      )
      const continuationTimes = [animationEnd]
      const samplesPerMotionFrame = 32

      for (let motionIndex = 0; motionIndex < motionTimes.length - 1; motionIndex++) {
        const segmentStart = motionTimes[motionIndex]!
        const segmentEnd = motionTimes[motionIndex + 1]!
        const visibleStart = Math.max(animationEnd, segmentStart)
        if (segmentEnd <= visibleStart) continue

        for (let sample = 1; sample <= samplesPerMotionFrame; sample++)
          continuationTimes.push(
            visibleStart + ((segmentEnd - visibleStart) * sample) / samplesPerMotionFrame,
          )
      }

      for (const time of continuationTimes) {
        motionOffsetAt(time, pathMotionOffset)
        if (paths) rotTmp.push(finalPath.clone().add(pathMotionOffset))
        if (paths)
          for (let endIndex = 0; endIndex < additionalRotTmp.length; endIndex++)
            additionalRotTmp[endIndex]!.push(
              finalAdditionalPaths[endIndex]!.clone().add(pathMotionOffset),
            )
        if (hands) posTmp.push(finalHand.clone().add(pathMotionOffset))
        pathSampleTimes.push(time)
      }
    }

    // Creates lines when Paths or Hands are enabled
    if (rotTmp.length > 0) {
      const line = createLine2(rotTmp, COLSET[color]![0], rsize * girth * multi, true)
      progressivePathLines.push(line)
      pathsGroup.add(line)
    }
    for (const additionalPoints of additionalRotTmp) {
      if (additionalPoints.length === 0) continue
      const line = createLine2(additionalPoints, COLSET[color]![0], rsize * girth * multi, true)
      progressivePathLines.push(line)
      additionalPathsGroup.add(line)
    }
    if (posTmp.length > 0) {
      const line = createLine2(posTmp, COLSET[color]![2], rsize * girth * multi, true, Math.PI)
      progressivePathLines.push(line)
      handsGroup.add(line)
    }
  }

  if (guides) {
    const // Material used for each guide
      lineMat = new LineMaterial({
        color: COLSET[color]![2],
        linewidth: gsize * multi, // Line thickness in pixels
        resolution: new Vector2(width, height), // Required for LineMaterial
      }) as LineMaterial2,
      // Line Geometry based on guidePoints
      lineGeo = new LineGeometry().setPositions(guidePoints.flatMap((point) => point.toArray()))

    // Store linewidth for updateLines() to reference
    lineMat.linewidth2 = lineMat.linewidth

    // Track material for resolution / linewidth updates
    lineMaterials.push(lineMat)

    // Build the Guides
    for (let i = 0; i < GUIDES.length; i++) {
      // Safety measure for when testing new point layouts
      if (GUIDES[i]!.length < 2) {
        console.log('Guide length < 2', i)
        continue
      }

      // Path Guides
      const line = new Line2(lineGeo, lineMat)
      line.quaternion.copy(gqua[i]!)
      guidesGroup.add(line)
    }
  }

  // modelProp allows manipulations independently from the group - Ex: Z Position / Depth, etc.
  modelGroup.add(modelProp) // Group within a Group
  motionGroup.add(modelGroup)
  motionGroup.add(anchorsGroup)
  motionGroup.add(guidesGroup)
  motionGroup.add(armsGroup)
  scene.add(motionGroup)
  scene.add(nodesGroup)
  scene.add(pathsGroup)
  scene.add(travelGroup)
  scene.add(handsGroup)

  const exportGroups: Record<ImageExportFeature, Group> = {
    paths: pathsGroup,
    travel: travelGroup,
    hands: handsGroup,
    arms: armsGroup,
    visible: modelGroup,
    nodes: nodesGroup,
    anchors: anchorsGroup,
    guides: guidesGroup,
  }

  return {
    get index() {
      return index
    },
    set index(val: number) {
      index = val
    },

    get AnimStart() {
      return AnimStart
    },
    set AnimStart(val: number) {
      AnimStart = val
    },

    get playing() {
      return playing
    },
    set playing(val: boolean) {
      playing = val
    },

    get click() {
      return click
    },
    get pobjs() {
      return pobjs
    },
    setExportHidden(features, hidden) {
      for (const feature of features) exportGroups[feature].visible = !hidden
    },
    setProgressivePaths(enabled) {
      progressivePaths = enabled
      updateProgressivePaths()
    },
    setDoublePaths(enabled) {
      additionalPathsGroup.visible = enabled
    },

    animate,
    seek,
    dimensions,
  }
}

const radBase = MathUtils.degToRad(5), // Number of degrees for each base point
  catmCount = 100, // Number of interpolated points
  // Builds a curve from points distributed across a rotation.
  catmCurve = (
    radRotation: number,
    Position: Vector3,
    Direction: Vector3,
    radStep: number = radBase,
  ) => {
    const stepCount = Math.max(1, Math.abs(Math.floor(radRotation / radStep))),
      stepRadians = radRotation / stepCount,
      stepPosition = Position.clone(),
      stepList = [Position]

    for (let j = 0; j < stepCount; j++)
      stepList.push(stepPosition.applyAxisAngle(Direction, stepRadians).clone())

    return new CatmullRomCurve3(stepList)
  },
  // Builds a list of points for a rotation and interpolates between them to a specific count.
  catmPoints = (
    radRotation: number,
    Position: Vector3,
    Direction: Vector3,
    radStep: number = radBase,
    Total: number = catmCount,
  ) => catmCurve(radRotation, Position, Direction, radStep).getPoints(Total - 1),
  catmPointsAt = (
    radRotation: number,
    Position: Vector3,
    Direction: Vector3,
    percentages: readonly number[],
  ) => {
    const curve = catmCurve(radRotation, Position, Direction)
    return percentages.map((percentage) => curve.getPoint(percentage))
  },
  // Guide points to create a circle
  guidePoints = catmPoints(
    MathUtils.degToRad(360),
    InitialPoint.clone().multiplyScalar(RADIUS),
    InitialPoint.clone().cross(InitialOrtho),
  ),
  // Rotations for the Guides
  gqua = GUIDES.map((objs /*i*/) => {
    if (objs.length < 2) return identity

    return new Quaternion().setFromUnitVectors(
      axis3,
      // Compute normal directly from the cross product of two edges
      new Vector3().crossVectors(PPOS[objs[0]!]!, PPOS[objs[1]!]!).normalize(),
    )
  }),
  // Point Geometry and Material
  PointMat = Object.fromEntries(
    Object.values(PTYPE).map((value) => {
      const properties = PPROP[value]
      return [
        value,
        {
          geometry: new SphereGeometry(properties.size * multi, 20, 20),
          geoclick: new SphereGeometry(properties.click * multi, 20, 20),
          geonode: new SphereGeometry(properties.node * multi * 1.4, 20, 20),
          material: createMarkerMaterial(COLSET[properties.color]![2]),
          matnode: createMarkerMaterial(COLSET[properties.color]![0]),
        },
      ]
    }),
  ) as Record<
    PointTypes,
    {
      geometry: SphereGeometry
      geoclick: SphereGeometry
      geonode: SphereGeometry
      material: MeshToonMaterial
      matnode: MeshToonMaterial
    }
  >,
  //  rot1Mat = new MeshBasicMaterial({ color: 0xff0000 }),
  rot1Geo = new SphereGeometry(0.1 * multi, 20, 20)
