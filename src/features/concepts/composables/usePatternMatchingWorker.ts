import type { InjectionKey } from 'vue'

import { createMessageChannel } from '@/workers/createMessageChannel'
import type {
  EightStepPatternMatchRequest,
  EightStepPatternMatchResult,
  PatternMatchingBridgeMap,
  PatternMatchingClient,
  QstPatternMatchRequest,
  QstPatternMatchResult,
  VtgPatternMatchRequest,
  VtgPatternMatchResult,
} from '@/workers/pattern-matching/PatternMatchingWorkerTypes'

const patternMatchingWorkerIdleMs = 30_000

export const patternMatchingClientKey: InjectionKey<PatternMatchingClient> =
  Symbol('patternMatchingClient')

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

const matchQstWithoutWorker = async (
  request: QstPatternMatchRequest,
): Promise<QstPatternMatchResult> => {
  const { matchQstPatternRequest } =
    await import('@/workers/pattern-matching/handlePatternMatchingRequest')
  return matchQstPatternRequest(request)
}

export const usePatternMatchingWorker = (): PatternMatchingClient => {
  let worker: Worker | undefined
  let channel: ReturnType<typeof createMessageChannel<PatternMatchingBridgeMap>> | undefined
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let activeRequests = 0
  let disposed = false

  const clearIdleTimer = () => {
    if (idleTimer === undefined) return

    clearTimeout(idleTimer)
    idleTimer = undefined
  }

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
    clearIdleTimer()
    channel?.close(new Error('Pattern matching worker stopped.'))
    worker?.terminate()
    channel = undefined
    worker = undefined
  }

  const scheduleStop = () => {
    clearIdleTimer()
    if (disposed || activeRequests > 0 || worker === undefined) return

    idleTimer = setTimeout(stop, patternMatchingWorkerIdleMs)
  }

  const callWorker = <Result>(
    call: (
      activeChannel: ReturnType<typeof createMessageChannel<PatternMatchingBridgeMap>>,
    ) => Promise<Result>,
    fallback: () => Promise<Result>,
  ): Promise<Result> => {
    clearIdleTimer()
    const activeChannel = ensureChannel()
    if (!activeChannel) return fallback()

    activeRequests += 1
    return call(activeChannel).finally(() => {
      activeRequests -= 1
      if (activeRequests === 0) scheduleStop()
    })
  }

  const matchVtg = (request: VtgPatternMatchRequest) =>
    callWorker(
      (activeChannel) => activeChannel.call('matchVtg', request),
      () => matchVtgWithoutWorker(request),
    )

  const matchEightStep = (request: EightStepPatternMatchRequest) =>
    callWorker(
      (activeChannel) => activeChannel.call('matchEightStep', request),
      () => matchEightStepWithoutWorker(request),
    )

  const matchQst = (request: QstPatternMatchRequest) =>
    callWorker(
      (activeChannel) => activeChannel.call('matchQst', request),
      () => matchQstWithoutWorker(request),
    )

  onBeforeUnmount(() => {
    disposed = true
    stop()
  })

  return { matchVtg, matchEightStep, matchQst }
}

export const usePatternMatchingClient = (): PatternMatchingClient =>
  inject(patternMatchingClientKey) ?? usePatternMatchingWorker()
