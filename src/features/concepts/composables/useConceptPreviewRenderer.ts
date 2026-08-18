import { rootCompile } from '@/math/animation/AnimFunc'
import { PROPTIMES } from '@/math/animation/PlayerFunc'
import type { RootDataFinal } from '@/types/AnimTypes'
import type { AnimBridgeMap } from '@/workers/animation/AnimWorkerTypes'
import { createMessageChannel } from '@/workers/createMessageChannel'

export interface ConceptPreviewDimensions {
  width: number
  height: number
}

interface UseConceptPreviewRendererOptions<Reference extends string> {
  dimensions: readonly ConceptPreviewDimensions[]
  references: readonly Reference[]
  createAnimation: (reference: Reference) => RootDataFinal | undefined
  label: string
  partialIndexes?: readonly number[]
  activeIndexes?: Readonly<Ref<readonly number[]>>
  frame?: 'first' | 'final'
}

const isBlobUrl = (url: string) => url.startsWith('blob:')

const revokePreviewUrl = (url: string) => {
  if (isBlobUrl(url) && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

export const useConceptPreviewRenderer = <Reference extends string>({
  dimensions,
  references,
  createAnimation,
  label,
  partialIndexes = [],
  activeIndexes,
  frame = 'first',
}: UseConceptPreviewRendererOptions<Reference>) => {
  const previewUrls = ref<string[]>(Array.from({ length: references.length }, () => ''))

  let worker: Worker | undefined
  let channel: ReturnType<typeof createMessageChannel<AnimBridgeMap>> | undefined
  let initialized = false
  let disposed = false
  let rendering = false
  let requestedVersion = 0
  let renderedVersion = 0
  let requestedPartialVersion = 0
  let renderedPartialVersion = 0

  const getActiveIndexes = () => activeIndexes?.value ?? references.map((_, index) => index)
  const hasRenderableDimensions = () =>
    dimensions.length === references.length &&
    getActiveIndexes().every((index) => {
      const item = dimensions[index]
      return item !== undefined && item.width > 0 && item.height > 0
    })

  const requestPreviews = () => {
    requestedVersion++
    if (initialized && !rendering) void renderRequestedPreviews()
  }

  const requestPartialPreviews = () => {
    requestedPartialVersion++
    if (initialized && !rendering) void renderRequestedPreviews()
  }

  const renderRequestedPreviews = async () => {
    if (!channel || rendering || !hasRenderableDimensions()) return

    rendering = true

    try {
      while (
        !disposed &&
        (renderedVersion !== requestedVersion || renderedPartialVersion !== requestedPartialVersion)
      ) {
        const renderAll = renderedVersion !== requestedVersion
        const version = requestedVersion
        const partialVersion = requestedPartialVersion
        const currentActiveIndexes = getActiveIndexes()
        const previewIndexes = renderAll
          ? currentActiveIndexes
          : partialIndexes.filter((index) => currentActiveIndexes.includes(index))
        let failed = false

        for (const index of previewIndexes) {
          if (
            disposed ||
            version !== requestedVersion ||
            (!renderAll && partialVersion !== requestedPartialVersion)
          )
            break

          const reference = references[index]
          const previewDimensions = dimensions[index]
          if (!reference || !previewDimensions) continue

          const animation = createAnimation(reference)
          if (!animation) continue

          const width = Math.max(1, Math.round(previewDimensions.width))
          const height = Math.max(1, Math.round(previewDimensions.height))
          channel.send('resize', {
            width,
            height,
            ratio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
          })
          channel.send('projection', {
            fov: 45,
            aspect: width / height,
            near: 0.1,
            far: 1000,
          })
          const compiled = rootCompile(animation)
          channel.send('data', compiled)

          try {
            const propTimes = PROPTIMES(compiled)[0]
            const time = frame === 'final' ? (propTimes?.at(-1) ?? 0) : 0
            const urls = await channel.call('reqimgs', [{ index: 0, time }])
            const nextUrl = urls[0]
            if (!nextUrl) continue

            if (
              disposed ||
              version !== requestedVersion ||
              (!renderAll && partialVersion !== requestedPartialVersion)
            ) {
              revokePreviewUrl(nextUrl)
              break
            }

            const previousUrl = previewUrls.value[index]
            previewUrls.value[index] = nextUrl
            if (previousUrl) revokePreviewUrl(previousUrl)
          } catch (error) {
            failed = true
            console.warn(`${label} preview rendering failed for cell ${reference}.`, error)
            break
          }
        }

        if (version === requestedVersion) {
          if (renderAll) renderedVersion = version
          if (partialVersion === requestedPartialVersion) renderedPartialVersion = partialVersion
        }
        if (failed) break
      }
    } finally {
      rendering = false
      if (
        !disposed &&
        initialized &&
        (renderedVersion !== requestedVersion || renderedPartialVersion !== requestedPartialVersion)
      )
        void renderRequestedPreviews()
    }
  }

  onMounted(async () => {
    if (typeof Worker === 'undefined') return

    worker = new Worker(new URL('@/workers/AnimWorker.ts', import.meta.url), { type: 'module' })
    channel = createMessageChannel<AnimBridgeMap>(worker)

    try {
      channel.warnStr(await channel.call('warnStr', `${label} Previews`))
      if (disposed) return

      initialized = await channel.call('initialize', { girth: 2, timeline: false })
      if (!initialized) console.warn(`${label} preview worker reported a failure to initialize.`)
    } catch (error) {
      console.warn(`Initialization of ${label} preview worker failed.`, error)
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
        console.warn(`${label} preview worker cleanup failed.`, error)
      })
      .finally(() => activeWorker.terminate())
  })

  return {
    previewUrls,
    requestPreviews,
    requestPartialPreviews,
  }
}
