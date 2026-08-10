import type { ConceptKey } from '@/features/concepts/types'
import { createMessageChannel } from '@/workers/createMessageChannel'
import type {
  EightStepPatternMatchRequest,
  EightStepPatternMatchResult,
  PatternMatchingBridgeMap,
  PatternMatchingClient,
  VtgPatternMatchRequest,
  VtgPatternMatchResult,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const supportsPatternMatching = (concept: ConceptKey) => concept === 'vtg' || concept === '8stp'

const matchVtgWithoutWorker = async (
  request: VtgPatternMatchRequest,
): Promise<VtgPatternMatchResult> => {
  const { matchVtgPatternRequest } =
    await import('@/workers/pattern-matching/handlePatternMatchingRequest')
  return matchVtgPatternRequest(request)
}

const matchEightStepWithoutWorker = async (
  request: EightStepPatternMatchRequest,
): Promise<EightStepPatternMatchResult> => {
  const { matchEightStepPatternRequest } =
    await import('@/workers/pattern-matching/handlePatternMatchingRequest')
  return matchEightStepPatternRequest(request)
}

export const usePatternMatchingWorker = (
  selectedConcept: Readonly<Ref<ConceptKey>>,
): PatternMatchingClient => {
  let worker: Worker | undefined
  let channel: ReturnType<typeof createMessageChannel<PatternMatchingBridgeMap>> | undefined

  const ensureChannel = () => {
    if (channel || typeof Worker === 'undefined') return channel

    worker = new Worker(
      new URL('@/workers/pattern-matching/PatternMatchingWorker.ts', import.meta.url),
      { type: 'module' },
    )
    channel = createMessageChannel<PatternMatchingBridgeMap>(worker)
    return channel
  }

  const stop = () => {
    channel?.close(new Error('Pattern matching worker stopped.'))
    worker?.terminate()
    channel = undefined
    worker = undefined
  }

  const matchVtg = (request: VtgPatternMatchRequest) =>
    ensureChannel()?.call('matchVtg', request) ?? matchVtgWithoutWorker(request)

  const matchEightStep = (request: EightStepPatternMatchRequest) =>
    ensureChannel()?.call('matchEightStep', request) ?? matchEightStepWithoutWorker(request)

  watch(selectedConcept, (concept) => {
    if (!supportsPatternMatching(concept)) stop()
  })
  onBeforeUnmount(stop)

  return { matchVtg, matchEightStep }
}
