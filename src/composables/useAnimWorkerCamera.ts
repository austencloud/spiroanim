import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PerspectiveCamera, Vector3 } from 'three'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { useViewportStore } from '@/stores/useViewportStore'
import type { createMessageChannel } from '@/workers/createMessageChannel'
import type { AnimBridgeMap } from '@/workers/animation/AnimWorkerTypes'

/** Main-thread DOM controls that temporarily override the worker-owned authored Camera. */
export function useAnimWorkerCamera(
  msgChnl: ReturnType<typeof createMessageChannel<AnimBridgeMap>>,
  dim: { width: number; height: number },
  store = 'main',
  eCanvas: Ref<HTMLElement | null | undefined>,
) {
  const { pixelRatio } = storeToRefs(useViewportStore())
  const playerStore = usePlayerStore(store)
  const { COMPILED } = playerStore.raw()
  const { PROJECTION, freeCamera, freeCameraPose, cameraReset } = storeToRefs(playerStore)
  const { send, call } = msgChnl

  const camera = new PerspectiveCamera(
    PROJECTION.value.fov,
    1,
    PROJECTION.value.near,
    PROJECTION.value.far,
  )
  const controls = new OrbitControls(camera, eCanvas.value)
  let interacting = false
  let acquired = false
  let acquisition = 0
  let freeCameraInitialized = false
  const controlOffset = new Vector3(0, 0, -1)

  watchImmediate([dim, pixelRatio], () => {
    send('resize', { width: dim.width, height: dim.height, ratio: pixelRatio.value })
  })

  watchImmediate([PROJECTION, dim], () => {
    const projection = { ...toRaw(PROJECTION.value), aspect: dim.width / dim.height }
    Object.assign(camera, projection)
    camera.updateProjectionMatrix()
    send('projection', projection)
  })

  const acquirePose = () => call('cameraAcquire', undefined)

  const applyControlPose = (pose: Awaited<ReturnType<typeof acquirePose>>) => {
    freeCameraPose.value = pose
    camera.position.fromArray(pose.position)
    controls.target.fromArray(pose.target)

    const radius = camera.position.distanceTo(controls.target)
    if (radius > 0) controlOffset.copy(camera.position).sub(controls.target).normalize()
    // OrbitControls multiplies its radius for zoom and pan, so an exact zero can never move.
    // Keep the authored worker pose unchanged and give only the local controls a near-plane basis.
    else camera.position.copy(controls.target).addScaledVector(controlOffset, camera.near)

    controls.update()
  }

  const acquire = async (afterWorkerSync = false) => {
    const request = ++acquisition
    acquired = false
    if (afterWorkerSync) {
      await nextTick()
      if (request !== acquisition || !freeCamera.value) return
    }
    const pose = await acquirePose()
    if (request !== acquisition) return
    applyControlPose(pose)
    acquired = true
  }

  const resetToInitialPose = async () => {
    const request = ++acquisition
    acquired = false
    await nextTick()
    if (request !== acquisition || !freeCamera.value) return
    const pose = await call('cameraReset', undefined)
    if (request !== acquisition) return
    applyControlPose(pose)
    acquired = true
  }

  const release = () => {
    acquisition++
    acquired = false
    send('cameraRelease', undefined)
  }

  useEventListener(controls, 'start', () => {
    interacting = true
    if (!acquired) void acquire()
  })

  useEventListener(controls, 'change', () => {
    if (!acquired) return
    const pose = {
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    }
    freeCameraPose.value = pose
    send('transform', pose)
  })

  useEventListener(controls, 'end', () => {
    interacting = false
    if (!freeCamera.value) release()
  })

  watchImmediate(freeCamera, (enabled) => {
    const restoringPersistedMode = !freeCameraInitialized
    freeCameraInitialized = true
    if (enabled) {
      if (!acquired) {
        if (restoringPersistedMode) void resetToInitialPose()
        else void acquire(true)
      }
    } else if (acquired && !interacting) release()
  })

  watch(
    () => JSON.stringify([COMPILED.value.bpm, COMPILED.value.camera]),
    () => {
      if (!freeCamera.value) return
      acquisition++
      acquired = false
      freeCameraPose.value = undefined
      void acquire(true)
    },
  )

  watch(cameraReset, () => {
    if (freeCamera.value) void resetToInitialPose()
  })

  onUnmounted(() => controls.dispose())
}
