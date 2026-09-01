interface ServiceWorkerControllerSource<Controller> {
  readonly controller: Controller | null
  addEventListener(type: 'controllerchange', listener: EventListener): void
  removeEventListener(type: 'controllerchange', listener: EventListener): void
}

interface ServiceWorkerUpdateRegistration {
  readonly installing: object | null
  update(): Promise<unknown>
}

interface ServiceWorkerUpdateWindow {
  readonly navigator: Pick<Navigator, 'onLine'>
  addEventListener(type: 'online', listener: EventListener): void
  clearInterval(intervalId: number): void
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  removeEventListener(type: 'online', listener: EventListener): void
  setInterval(handler: TimerHandler, timeout?: number): number
}

interface ServiceWorkerUpdateDocument {
  readonly visibilityState: DocumentVisibilityState
  addEventListener(type: 'visibilitychange', listener: EventListener): void
  removeEventListener(type: 'visibilitychange', listener: EventListener): void
}

interface ServiceWorkerUpdateSchedule {
  intervalMs?: number
  minimumCheckIntervalMs?: number
  now?: () => number
}

const DEFAULT_UPDATE_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_MINIMUM_CHECK_INTERVAL_MS = 60 * 1000

export function reloadOnServiceWorkerControllerReplacement<Controller>(
  source: ServiceWorkerControllerSource<Controller>,
  reload: () => void,
): () => void {
  let controller = source.controller

  const handleControllerChange: EventListener = () => {
    const previousController = controller
    controller = source.controller

    if (previousController !== null && controller !== null && controller !== previousController) {
      reload()
    }
  }

  source.addEventListener('controllerchange', handleControllerChange)

  return () => {
    source.removeEventListener('controllerchange', handleControllerChange)
  }
}

export function scheduleServiceWorkerUpdates(
  registration: ServiceWorkerUpdateRegistration,
  workerUrl: string,
  sourceWindow: ServiceWorkerUpdateWindow,
  sourceDocument: ServiceWorkerUpdateDocument,
  {
    intervalMs = DEFAULT_UPDATE_INTERVAL_MS,
    minimumCheckIntervalMs = DEFAULT_MINIMUM_CHECK_INTERVAL_MS,
    now = Date.now,
  }: ServiceWorkerUpdateSchedule = {},
): () => void {
  let lastCheck = 0

  const checkForUpdate = async () => {
    const checkTime = now()
    if (
      registration.installing ||
      !sourceWindow.navigator.onLine ||
      sourceDocument.visibilityState !== 'visible' ||
      checkTime - lastCheck < minimumCheckIntervalMs
    ) {
      return
    }

    lastCheck = checkTime

    try {
      const response = await sourceWindow.fetch(workerUrl, { cache: 'no-store' })
      if (response.ok) await registration.update()
    } catch {
      // Update discovery is opportunistic. The next online, visible, or scheduled check retries.
    }
  }

  const handleOnline: EventListener = () => {
    void checkForUpdate()
  }
  const handleVisibilityChange: EventListener = () => {
    void checkForUpdate()
  }
  const intervalId = sourceWindow.setInterval(() => {
    void checkForUpdate()
  }, intervalMs)

  sourceWindow.addEventListener('online', handleOnline)
  sourceDocument.addEventListener('visibilitychange', handleVisibilityChange)
  void checkForUpdate()

  return () => {
    sourceWindow.clearInterval(intervalId)
    sourceWindow.removeEventListener('online', handleOnline)
    sourceDocument.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
