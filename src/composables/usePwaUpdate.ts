import { Workbox, type WorkboxLifecycleEvent } from 'workbox-window'

import {
  reloadOnServiceWorkerControllerReplacement,
  scheduleServiceWorkerUpdates,
} from '@/services/pwaUpdate'

const SERVICE_WORKER_URL = '/sw.js'

export function usePwaUpdate() {
  const offlineReady = ref(false)
  const needRefresh = ref(false)
  let reloadStarted = false
  let workbox: Workbox | undefined
  let stopControllerChangeReload: () => void = () => undefined
  let stopScheduledUpdates: () => void = () => undefined

  function reloadPage() {
    if (reloadStarted) return

    reloadStarted = true
    window.location.reload()
  }

  function showUpdatePrompt() {
    needRefresh.value = true
  }

  function handleInstalled(event: WorkboxLifecycleEvent) {
    if (typeof event.isUpdate === 'undefined') {
      if (typeof event.isExternal !== 'undefined') {
        if (event.isExternal) showUpdatePrompt()
        else if (!needRefresh.value) offlineReady.value = true
      } else if (!needRefresh.value) {
        offlineReady.value = true
      }
    } else if (!event.isUpdate) {
      offlineReady.value = true
    }
  }

  onMounted(async () => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    stopControllerChangeReload = reloadOnServiceWorkerControllerReplacement(
      navigator.serviceWorker,
      reloadPage,
    )

    workbox = new Workbox(SERVICE_WORKER_URL)
    workbox.addEventListener('installed', handleInstalled)
    workbox.addEventListener('waiting', showUpdatePrompt)

    try {
      const registration = await workbox.register({ immediate: true })
      if (registration) {
        stopScheduledUpdates = scheduleServiceWorkerUpdates(
          registration,
          SERVICE_WORKER_URL,
          window,
          document,
        )
      }
    } catch (error) {
      console.error('PWA service worker registration failed.', error)
    }
  })

  onBeforeUnmount(() => {
    stopControllerChangeReload()
    stopScheduledUpdates()
    workbox?.removeEventListener('installed', handleInstalled)
    workbox?.removeEventListener('waiting', showUpdatePrompt)
  })

  function applyUpdate() {
    workbox?.messageSkipWaiting()
  }

  function dismiss() {
    offlineReady.value = false
    needRefresh.value = false
  }

  return {
    applyUpdate,
    dismiss,
    needRefresh: readonly(needRefresh),
    offlineReady: readonly(offlineReady),
  }
}
