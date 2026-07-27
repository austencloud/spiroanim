interface ServiceWorkerControllerSource<Controller> {
  readonly controller: Controller | null
  addEventListener(type: 'controllerchange', listener: EventListener): void
  removeEventListener(type: 'controllerchange', listener: EventListener): void
}

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
