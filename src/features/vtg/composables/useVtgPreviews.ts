import { PerspectiveCamera } from 'three'

import { createVtgPreviewAnimation } from '@/features/vtg/createVtgAnimation'
import type {
  VtgCellReference,
  VtgPatternSelection,
  VtgQuarterMode,
  VtgSpeedRatio,
} from '@/features/vtg/types'
import { rootCompile } from '@/math/animation/AnimFunc'
import type { AnimBridgeMap } from '@/workers/animation/AnimWorkerTypes'
import { createMessageChannel } from '@/workers/createMessageChannel'

interface VtgPreviewDimensions {
  width: number
  height: number
}

interface UseVtgPreviewsOptions {
  dimensions: readonly VtgPreviewDimensions[]
  speedRatio: Ref<VtgSpeedRatio>
  isAnti: Ref<boolean>
  swapProps: Ref<boolean>
  reversePlane: Ref<boolean>
  scale: Ref<number>
  quarters: Ref<VtgQuarterMode | false>
}

export const vtgPreviewReferences = [
  '1-1',
  '3-1',
  '5-1',
  '1-3',
  '3-3',
  '5-3',
  '1-5',
  '3-5',
  '5-5',
] as const satisfies readonly VtgCellReference[]

const spinToggleCells: ReadonlySet<VtgCellReference> = new Set(['5-6', '6-6', '5-5', '6-5'])
const spinPreviewIndexes = vtgPreviewReferences.flatMap((reference, index) =>
  spinToggleCells.has(reference) ? [index] : [],
)

const isBlobUrl = (url: string) => url.startsWith('blob:')

const revokePreviewUrl = (url: string) => {
  if (isBlobUrl(url) && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

const hasRenderableDimensions = (
  dimensions: readonly VtgPreviewDimensions[],
): dimensions is readonly VtgPreviewDimensions[] =>
  dimensions.length === vtgPreviewReferences.length &&
  dimensions.every(({ width, height }) => width > 0 && height > 0)

export const useVtgPreviews = ({
  dimensions,
  speedRatio,
  isAnti,
  swapProps,
  reversePlane,
  scale,
  quarters,
}: UseVtgPreviewsOptions) => {
  const previewUrls = ref<string[]>(Array.from({ length: vtgPreviewReferences.length }, () => ''))

  let worker: Worker | undefined
  let channel: ReturnType<typeof createMessageChannel<AnimBridgeMap>> | undefined
  let initialized = false
  let disposed = false
  let rendering = false
  let requestedVersion = 0
  let renderedVersion = 0
  let requestedSpinVersion = 0
  let renderedSpinVersion = 0

  const requestPreviews = () => {
    requestedVersion++
    if (initialized && !rendering) void renderRequestedPreviews()
  }

  const requestSpinPreviews = () => {
    requestedSpinVersion++
    if (initialized && !rendering) void renderRequestedPreviews()
  }

  const buildSelection = (reference: VtgCellReference): VtgPatternSelection => {
    const selection: VtgPatternSelection = {
      reference,
      speedRatio: speedRatio.value,
      scale: scale.value,
    }

    if (spinToggleCells.has(reference)) selection.isAnti = isAnti.value
    if (swapProps.value) selection.swapProps = true
    if (reversePlane.value) selection.reversePlane = true
    if (quarters.value) selection.quarters = quarters.value

    return selection
  }

  const renderRequestedPreviews = async () => {
    if (!channel || rendering || !hasRenderableDimensions(dimensions)) return

    rendering = true

    try {
      while (
        !disposed &&
        (renderedVersion !== requestedVersion || renderedSpinVersion !== requestedSpinVersion)
      ) {
        const renderAll = renderedVersion !== requestedVersion
        const version = requestedVersion
        const spinVersion = requestedSpinVersion
        const previewIndexes = renderAll
          ? vtgPreviewReferences.map((_, index) => index)
          : spinPreviewIndexes
        let failed = false

        for (const index of previewIndexes) {
          if (
            disposed ||
            version !== requestedVersion ||
            (!renderAll && spinVersion !== requestedSpinVersion)
          )
            break

          const reference = vtgPreviewReferences[index]
          const previewDimensions = dimensions[index]
          if (!reference || !previewDimensions) continue

          const animation = createVtgPreviewAnimation(buildSelection(reference))
          if (!animation) continue

          const width = Math.max(1, Math.round(previewDimensions.width))
          const height = Math.max(1, Math.round(previewDimensions.height))
          const camera = new PerspectiveCamera(45, width / height, 0.1, 1000)
          camera.position.set(0, 0, -animation.distance)
          camera.lookAt(0, 0, 0)

          channel.send('resize', {
            width,
            height,
            ratio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
          })
          channel.send('projection', {
            fov: camera.fov,
            aspect: camera.aspect,
            near: camera.near,
            far: camera.far,
          })
          channel.send('transform', {
            pos: camera.position.toArray(),
            rot: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
          })
          channel.send('data', rootCompile(animation))

          try {
            const urls = await channel.call('reqimgs', [0])
            const nextUrl = urls[0]
            if (!nextUrl) continue

            if (
              disposed ||
              version !== requestedVersion ||
              (!renderAll && spinVersion !== requestedSpinVersion)
            ) {
              revokePreviewUrl(nextUrl)
              break
            }

            const previousUrl = previewUrls.value[index]
            previewUrls.value[index] = nextUrl
            if (previousUrl) revokePreviewUrl(previousUrl)
          } catch (error) {
            failed = true
            console.warn(`VTG preview rendering failed for cell ${reference}.`, error)
            break
          }
        }

        if (version === requestedVersion) {
          if (renderAll) renderedVersion = version
          if (spinVersion === requestedSpinVersion) renderedSpinVersion = spinVersion
        }
        if (failed) break
      }
    } finally {
      rendering = false
      if (
        !disposed &&
        initialized &&
        (renderedVersion !== requestedVersion || renderedSpinVersion !== requestedSpinVersion)
      )
        void renderRequestedPreviews()
    }
  }

  // BPM changes animation timing only, so they intentionally do not invalidate still previews.
  watch([speedRatio, swapProps, reversePlane, scale, quarters], requestPreviews)
  watch(isAnti, requestSpinPreviews)

  onMounted(async () => {
    if (typeof Worker === 'undefined') return

    worker = new Worker(new URL('@/workers/AnimWorker.ts', import.meta.url), { type: 'module' })
    channel = createMessageChannel<AnimBridgeMap>(worker)

    try {
      channel.warnStr(await channel.call('warnStr', 'VTG Previews'))
      if (disposed) return

      initialized = await channel.call('initialize', { girth: 2, timeline: false })
      if (!initialized) console.warn('VTG preview worker reported a failure to initialize.')
    } catch (error) {
      console.warn('Initialization of VTG preview worker failed.', error)
    }

    if (!disposed && initialized) requestPreviews()
  })

  onBeforeUnmount(() => {
    disposed = true
    requestedVersion++
    previewUrls.value.forEach(revokePreviewUrl)

    const activeWorker = worker
    if (!channel || !activeWorker) return

    channel
      .call('dispose', undefined)
      .catch((error: unknown) => {
        console.warn('VTG preview worker cleanup failed.', error)
      })
      .finally(() => activeWorker.terminate())
  })

  return {
    previewUrls,
    requestPreviews,
  }
}
